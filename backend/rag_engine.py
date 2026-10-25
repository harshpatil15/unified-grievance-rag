import os
import re
import time
from typing import List, Tuple, Optional
import google.generativeai as genai

from backend.config import config, DEFAULT_TOP_K
from backend.ingestion import get_collection
from backend.models import Citation, QueryRequest, QueryResponse

def retrieve_chunks(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    filter_doc: Optional[str] = None
) -> List[Citation]:
    """Retrieve top-k relevant chunks from ChromaDB with relevance scoring."""
    try:
        collection = get_collection()
        where_filter = {"doc_name": filter_doc} if filter_doc else None
        
        # Ensure collection has items
        if collection.count() == 0:
            return []
            
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()),
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        citations: List[Citation] = []
        if not results or not results["documents"] or len(results["documents"][0]) == 0:
            return []
            
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        distances = results["distances"][0]
        
        for doc_text, meta, dist in zip(docs, metas, distances):
            # Chroma cosine distance ranges from 0 (identical) to 2 (opposite)
            relevance = max(0.0, min(1.0, 1.0 - (float(dist) / 2.0)))
            citations.append(
                Citation(
                    doc_name=meta.get("doc_name", "Unknown"),
                    page_num=int(meta.get("page_num", 1)),
                    section=meta.get("section", "General"),
                    chunk_id=meta.get("chunk_id", ""),
                    snippet=doc_text,
                    relevance_score=round(relevance * 100, 1)
                )
            )
            
        # Sort by relevance descending
        citations.sort(key=lambda x: x.relevance_score, reverse=True)
        return citations
        
    except Exception as e:
        print(f"Error during retrieval: {e}")
        return []

def generate_local_synthesis(query: str, role: str, citations: List[Citation]) -> str:
    """Generate clean, highly readable, structured grounded answers from retrieved evidence."""
    if not citations:
        return (
            "The available municipal knowledge base documents do not contain sufficient "
            "evidence to answer or verify this question. Please verify your query or consult "
            "official BMC / MMC administrative records."
        )

    # Content keyword grounding check
    stop_words = {
        "what", "is", "the", "for", "on", "in", "at", "to", "a", "an", "and", "or",
        "how", "do", "does", "are", "of", "with", "about", "can", "could", "should",
        "would", "this", "that", "these", "those", "tell", "me", "give", "show"
    }
    query_words = [w.lower() for w in re.findall(r"[a-zA-Z]{3,}", query) if w.lower() not in stop_words]
    
    # Check if any content word from query appears in the top citations
    combined_snippets = " ".join([c.snippet.lower() for c in citations[:3]])
    has_keyword_match = any(w in combined_snippets for w in query_words) if query_words else True
    
    if not has_keyword_match:
        return (
            "The provided municipal and grievance documents do not contain sufficient evidence "
            "to answer or verify this question. (No matching policy clauses or records found in the knowledge base)."
        )

    role_title = "Citizen Assistant" if role == "citizen" else "Officer Resolution Copilot"

    # Extract high-value sentences from snippets
    key_points = []
    seen_points = set()
    for c in citations[:3]:
        # Split snippet into sentences and filter informative ones
        sentences = re.split(r"(?<=[.!?])\s+", c.snippet)
        for s in sentences:
            s_clean = s.strip().replace("\n", " ")
            # Keep sentences that have substance and are not repeated
            if len(s_clean) > 35 and s_clean.lower() not in seen_points:
                seen_points.add(s_clean.lower())
                key_points.append((s_clean, c.doc_name, c.page_num))
                if len(key_points) >= 5:
                    break
        if len(key_points) >= 5:
            break

    lines = [
        f"### {role_title} Summary\n",
        f"**Query:** *{query}*\n",
        "#### 📌 Key Findings & Procedures:"
    ]

    for pt, doc, page in key_points:
        lines.append(f"- {pt} `[{doc}, Page {page}]`")

    lines.append("\n#### 📚 Verified Source References:")
    for idx, c in enumerate(citations[:3], 1):
        lines.append(
            f"{idx}. **{c.doc_name}** — Page {c.page_num} "
            f"*(Section: {c.section}, Relevance: {c.relevance_score}%)*"
        )

    return "\n".join(lines)

def query_gemini_rag(
    query: str,
    role: str,
    citations: List[Citation],
    api_key: str,
    model_name: str = "gemini-3.8-flash"
) -> str:
    """Generates strictly grounded answer using Gemini LLM with automatic model fallback."""
    genai.configure(api_key=api_key)
    
    # Build formatted evidence block
    evidence_blocks = []
    for idx, c in enumerate(citations, 1):
        evidence_blocks.append(
            f"[EVIDENCE {idx}]\n"
            f"File: {c.doc_name}\n"
            f"Page: {c.page_num}\n"
            f"Section: {c.section}\n"
            f"Excerpt:\n{c.snippet}\n"
        )
    evidence_text = "\n----------------------------------------\n".join(evidence_blocks)

    if role == "citizen":
        role_instructions = (
            "You are the Citizen Grievance Assistant for Municipal Corporation services. "
            "Explain everything in plain, easy-to-understand language. Make the answer crystal clear, "
            "well-organized with bullet points, bold highlights for SLAs or timelines, and step-by-step guidance. "
            "Help citizens understand grievance filing procedures, SLA timelines, resolution stages, "
            "ward office jurisdictions, and Right to Services (RTS) / Right to Information (RTI) rights."
        )
    else:
        role_instructions = (
            "You are the Officer Resolution Copilot for Municipal Corporation Officers and Engineers. "
            "Provide professional, structured, authoritative resolution guidance. "
            "Assist officers with legal clauses (MMC Act 1888, MMC Act 1949), circular numbers, "
            "USOR schedule item rates, administrative powers, jurisdiction, and grievance escalation compliance."
        )

    system_prompt = f"""{role_instructions}

STRICT GROUNDING & CITATION RULES:
1. Answer the question relying STRICTLY AND ONLY on the provided evidence excerpts below.
2. Formulate your answer in simple, natural, easy-to-understand language. Avoid raw jargon or dumping unformatted text.
3. For EVERY factual statement, timeline, legal power, or grievance rule, include explicit inline citations in the format: `[Document Name.pdf, Page X]`.
4. If the provided evidence excerpts DO NOT contain sufficient information to answer the question or verify the answer, explicitly state:
   "The provided municipal and grievance documents do not contain sufficient evidence to answer this question."
5. NEVER fabricate citations, page numbers, bylaws, or facts.
6. Provide a clean, structured response:
   - Summary / Direct Answer
   - Timelines & SLAs (if applicable)
   - Step-by-Step Procedure or Officer Action Required
   - Official Document Citations

EVIDENCE FROM MUNICIPAL DOCUMENTS:
{evidence_text}

USER QUESTION:
{query}
"""

    candidate_models = [
        model_name,
        "gemini-3.8-flash",
        "gemini-3.8-flash-lite",
        "gemini-flash-latest",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-pro-latest"
    ]
    # Remove duplicates while preserving order
    unique_candidates = []
    for m in candidate_models:
        if m and m not in unique_candidates:
            unique_candidates.append(m)

    last_error = None
    for candidate in unique_candidates:
        try:
            model = genai.GenerativeModel(candidate)
            response = model.generate_content(system_prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            err_str = str(e)
            print(f"Model {candidate} failed: {err_str[:120]}")
            # If rate limit (429), sleep 2 seconds and try lighter candidate
            if "429" in err_str:
                time.sleep(2)
            continue

    # Fallback to local structured synthesis if all Gemini candidate calls fail
    fallback = generate_local_synthesis(query, role, citations)
    return f"{fallback}\n\n*(Notice: LLM generation fell back to structured local engine. Error: {str(last_error)[:120]})*"

def execute_rag_pipeline(request: QueryRequest) -> QueryResponse:
    """Main RAG pipeline entrypoint."""
    citations = retrieve_chunks(
        query=request.query,
        top_k=request.top_k,
        filter_doc=request.filter_doc
    )

    # Check relevance threshold - if the best chunk is completely unrelated (< 30%)
    if not citations or citations[0].relevance_score < 30.0:
        return QueryResponse(
            query=request.query,
            role=request.role,
            answer=(
                "The provided municipal and grievance documents do not contain sufficient "
                "evidence to answer or verify this question. (No matching sections found in the knowledge base)."
            ),
            citations=[],
            evidence_count=0,
            is_grounded=False,
            llm_used="Grounding Guardrail (Zero Match)"
        )

    # Check for Gemini API key
    active_key = request.api_key or config.gemini_api_key or os.getenv("GEMINI_API_KEY", "")

    if active_key and active_key.strip():
        answer = query_gemini_rag(
            query=request.query,
            role=request.role,
            citations=citations,
            api_key=active_key.strip(),
            model_name=config.gemini_model
        )
        llm_name = f"Gemini ({config.gemini_model})"
    else:
        answer = generate_local_synthesis(
            query=request.query,
            role=request.role,
            citations=citations
        )
        llm_name = "Local Grounded Engine (ChromaDB + Rule Synthesis)"

    return QueryResponse(
        query=request.query,
        role=request.role,
        answer=answer,
        citations=citations,
        evidence_count=len(citations),
        is_grounded=True,
        llm_used=llm_name
    )
