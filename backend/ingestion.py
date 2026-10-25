import os
import re
import json
import hashlib
import time
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional

import fitz  # PyMuPDF
import chromadb
from chromadb.config import Settings

from backend.config import (
    PDF_DIR,
    CHROMA_DIR,
    MANIFEST_FILE,
    COLLECTION_NAME,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_CHUNK_OVERLAP,
)
from backend.models import DocumentMetadata, IngestionReport

# Global state for background ingestion tracking
ingestion_lock = threading.Lock()
ingestion_state = {
    "is_indexing": False,
    "progress_percentage": 100.0,
    "current_file": "",
    "total_files": 0,
    "processed_files": 0,
    "total_chunks": 0,
    "indexed_files": 0,
    "skipped_files": 0,
    "failed_files": 0,
    "documents": [],
    "message": "Ready"
}

def get_chroma_client():
    os.makedirs(CHROMA_DIR, exist_ok=True)
    return chromadb.PersistentClient(path=str(CHROMA_DIR))

def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

def calculate_file_hash(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def clean_page_text(text: str) -> str:
    """Clean common PDF extraction artifacts, headers, and footers."""
    lines = text.split("\n")
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        # Drop trivial page number lines or single punctuation
        if re.match(r"^Page\s+\d+(\s+of\s+\d+)?$", stripped, re.IGNORECASE):
            continue
        if re.match(r"^\d+$", stripped) and len(stripped) < 4:
            continue
        cleaned_lines.append(line)
        
    cleaned = "\n".join(cleaned_lines)
    # Normalize multiple whitespace but preserve paragraph breaks
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()

def detect_section_heading(text: str, current_section: str = "General") -> str:
    """Detect section, chapter, rule or title headings in page text."""
    lines = text.split("\n")
    patterns = [
        r"^(Section\s+\d+[^:\n]*)",
        r"^(Chapter\s+[IVXLCDM\d]+[^:\n]*)",
        r"^(Rule\s+\d+[^:\n]*)",
        r"^(Part\s+[IVXLCDM\d]+[^:\n]*)",
        r"^(Stage\s+\w+[^:\n]*)",
        r"^(Schedule\s+[^:\n]*)",
        r"^([0-9]+\.\s+[A-Z][A-Za-z\s]{3,40})",
        r"^([A-Z\s]{4,40}:)",
    ]
    for line in lines[:10]:
        stripped = line.strip()
        if not stripped or len(stripped) > 80:
            continue
        for pat in patterns:
            match = re.match(pat, stripped, re.IGNORECASE)
            if match:
                return match.group(1).strip()
    return current_section

def recursive_chunk_text(text: str, chunk_size: int = DEFAULT_CHUNK_SIZE, overlap: int = DEFAULT_CHUNK_OVERLAP) -> List[str]:
    """Splits text into meaningful chunks respecting paragraph and sentence boundaries."""
    if not text or len(text.strip()) == 0:
        return []
    
    if len(text) <= chunk_size:
        return [text.strip()]
    
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # If single paragraph is larger than chunk size, split by sentences
        if len(para) > chunk_size:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sent in sentences:
                sent = sent.strip()
                if not sent:
                    continue
                if len(current_chunk) + len(sent) + 1 <= chunk_size:
                    current_chunk = f"{current_chunk} {sent}".strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                        # Keep overlap from the end of current_chunk
                        overlap_start = max(0, len(current_chunk) - overlap)
                        current_chunk = current_chunk[overlap_start:].strip() + " " + sent
                    else:
                        chunks.append(sent[:chunk_size])
                        current_chunk = sent[chunk_size - overlap:]
        else:
            if len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                    overlap_start = max(0, len(current_chunk) - overlap)
                    current_chunk = current_chunk[overlap_start:].strip() + "\n\n" + para
                else:
                    current_chunk = para
                    
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return [c for c in chunks if len(c) > 30]

def load_manifest() -> Dict[str, Any]:
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_manifest(manifest: Dict[str, Any]):
    os.makedirs(MANIFEST_FILE.parent, exist_ok=True)
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def ingest_pdf_file(
    filepath: Path,
    collection,
    manifest: Dict[str, Any],
    force: bool = False
) -> DocumentMetadata:
    filename = filepath.name
    file_size_mb = round(filepath.stat().st_size / (1024 * 1024), 2)
    file_hash = calculate_file_hash(filepath)
    
    # Check if unchanged and already indexed
    if not force and filename in manifest:
        existing = manifest[filename]
        if existing.get("file_hash") == file_hash and existing.get("status") in ["indexed", "scanned_warning"]:
            return DocumentMetadata(
                filename=filename,
                file_size_mb=file_size_mb,
                page_count=existing.get("page_count", 0),
                chunk_count=existing.get("chunk_count", 0),
                is_scanned=existing.get("is_scanned", False),
                file_hash=file_hash,
                status="skipped",
                last_indexed=existing.get("last_indexed"),
                error_message=existing.get("error_message")
            )
            
    # Remove existing chunks for this document if reindexing
    try:
        collection.delete(where={"doc_name": filename})
    except Exception:
        pass

    try:
        doc = fitz.open(filepath)
        page_count = len(doc)
        total_extracted_chars = 0
        all_chunks = []
        all_metas = []
        all_ids = []
        current_section = "General"
        
        for page_idx in range(page_count):
            page_num = page_idx + 1
            page = doc[page_idx]
            raw_text = page.get_text()
            total_extracted_chars += len(raw_text)
            
            cleaned_text = clean_page_text(raw_text)
            current_section = detect_section_heading(cleaned_text, current_section)
            
            page_chunks = recursive_chunk_text(cleaned_text)
            for c_idx, chunk in enumerate(page_chunks):
                chunk_id = f"{filename}#p{page_num}#c{c_idx}"
                all_chunks.append(chunk)
                all_ids.append(chunk_id)
                all_metas.append({
                    "doc_name": filename,
                    "page_num": int(page_num),
                    "section": str(current_section),
                    "chunk_id": chunk_id,
                    "char_count": int(len(chunk))
                })
                
        doc.close()
        
        # Determine if document is scanned / image-only
        avg_chars_per_page = total_extracted_chars / max(1, page_count)
        is_scanned = avg_chars_per_page < 30
        
        # Batch insert chunks into ChromaDB
        chunk_count = len(all_chunks)
        batch_size = 150
        for i in range(0, chunk_count, batch_size):
            batch_end = min(i + batch_size, chunk_count)
            collection.add(
                documents=all_chunks[i:batch_end],
                metadatas=all_metas[i:batch_end],
                ids=all_ids[i:batch_end]
            )
            
        status = "scanned_warning" if is_scanned and chunk_count == 0 else "indexed"
        error_msg = "Scanned/Image-based PDF (contains minimal or no raw text layer)" if is_scanned and chunk_count == 0 else None
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        
        meta = DocumentMetadata(
            filename=filename,
            file_size_mb=file_size_mb,
            page_count=page_count,
            chunk_count=chunk_count,
            is_scanned=is_scanned,
            file_hash=file_hash,
            status=status,
            last_indexed=timestamp,
            error_message=error_msg
        )
        
        manifest[filename] = meta.model_dump()
        return meta

    except Exception as e:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        meta = DocumentMetadata(
            filename=filename,
            file_size_mb=file_size_mb,
            page_count=0,
            chunk_count=0,
            is_scanned=False,
            file_hash=file_hash,
            status="failed",
            last_indexed=timestamp,
            error_message=str(e)
        )
        manifest[filename] = meta.model_dump()
        return meta

def run_ingestion_pipeline(force: bool = False) -> IngestionReport:
    global ingestion_state
    with ingestion_lock:
        if ingestion_state["is_indexing"]:
            return get_current_ingestion_report()
        ingestion_state["is_indexing"] = True
        ingestion_state["message"] = "Ingestion started..."
        ingestion_state["progress_percentage"] = 0.0

    try:
        os.makedirs(PDF_DIR, exist_ok=True)
        collection = get_collection()
        manifest = load_manifest()
        
        pdf_files = sorted([f for f in PDF_DIR.iterdir() if f.suffix.lower() == ".pdf"])
        total = len(pdf_files)
        
        ingestion_state["total_files"] = total
        ingestion_state["processed_files"] = 0
        ingestion_state["indexed_files"] = 0
        ingestion_state["skipped_files"] = 0
        ingestion_state["failed_files"] = 0
        ingestion_state["total_chunks"] = 0
        ingestion_state["documents"] = []

        docs_meta = []
        for idx, pdf_path in enumerate(pdf_files):
            ingestion_state["current_file"] = pdf_path.name
            ingestion_state["message"] = f"Processing ({idx+1}/{total}): {pdf_path.name}"
            
            meta = ingest_pdf_file(pdf_path, collection, manifest, force=force)
            docs_meta.append(meta)
            
            if meta.status == "indexed":
                ingestion_state["indexed_files"] += 1
                ingestion_state["total_chunks"] += meta.chunk_count
            elif meta.status == "skipped":
                ingestion_state["skipped_files"] += 1
                ingestion_state["total_chunks"] += meta.chunk_count
            elif meta.status == "scanned_warning":
                ingestion_state["indexed_files"] += 1
            else:
                ingestion_state["failed_files"] += 1
                
            ingestion_state["processed_files"] = idx + 1
            ingestion_state["progress_percentage"] = round(((idx + 1) / max(1, total)) * 100, 1)

        save_manifest(manifest)
        
        # Update total chunks directly from Chroma
        try:
            total_chroma_chunks = collection.count()
        except Exception:
            total_chroma_chunks = ingestion_state["total_chunks"]

        ingestion_state["total_chunks"] = total_chroma_chunks
        ingestion_state["documents"] = [m.model_dump() for m in docs_meta]
        ingestion_state["is_indexing"] = False
        ingestion_state["progress_percentage"] = 100.0
        ingestion_state["message"] = f"Ingestion complete. {ingestion_state['indexed_files']} indexed, {ingestion_state['skipped_files']} skipped, {ingestion_state['failed_files']} failed. Total chunks: {total_chroma_chunks}."

        return get_current_ingestion_report()

    except Exception as e:
        ingestion_state["is_indexing"] = False
        ingestion_state["message"] = f"Ingestion failed with error: {str(e)}"
        return get_current_ingestion_report()

def get_current_ingestion_report() -> IngestionReport:
    manifest = load_manifest()
    docs = []
    
    if ingestion_state["documents"]:
        docs = [DocumentMetadata(**d) for d in ingestion_state["documents"]]
    elif manifest:
        docs = [DocumentMetadata(**v) for v in manifest.values()]
        
    try:
        col = get_collection()
        total_chunks = col.count()
    except Exception:
        total_chunks = ingestion_state["total_chunks"]

    indexed = sum(1 for d in docs if d.status == "indexed")
    skipped = sum(1 for d in docs if d.status == "skipped")
    failed = sum(1 for d in docs if d.status == "failed")
    
    return IngestionReport(
        total_files=len(docs),
        indexed_files=indexed,
        skipped_files=skipped,
        failed_files=failed,
        total_chunks=total_chunks,
        is_indexing=ingestion_state["is_indexing"],
        progress_percentage=ingestion_state["progress_percentage"],
        documents=docs,
        message=ingestion_state["message"]
    )
