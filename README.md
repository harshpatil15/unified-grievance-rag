# CivicFix AI - Municipal Grievance RAG Knowledge Base

An enterprise-grade, evidence-grounded Retrieval-Augmented Generation (RAG) system built from scratch for Municipal Grievance Handling, Acts, Citizen Charters, and Officer Resolution.

---

## 🌟 Key Features

1. **Official PDF Knowledge Base (31 Real Documents)**
   - Fully ingested and indexed from `knowledge_base/pdfs/`.
   - **5,158 high-density chunks** stored in persistent ChromaDB vector store.
   - Includes Mumbai Municipal Corporation Act 1888, Maharashtra Municipal Corporations Act 1949, CivicFix Grievance User Guides, RTI Manuals (SWM & Maintenance), Roads USOR 2023, Citizen Charters, and Circulars.

2. **Role-Based Retrieval & Synthesis**
   - **Citizen Assistant**: Answers filing procedures, SLA turnaround times, ward office contacts, and Right to Services (RTS) appeal workflows.
   - **Officer Resolution Copilot**: Audits legal powers, MMC Act sections (e.g. Commissioner powers, demolition notices), USOR schedule item rates, and administrative compliance.

3. **Strict Evidence Grounding & Guardrails**
   - Every claim is tied to verifiable citations: `[Document Name, Page X, Section Y]`.
   - **Zero Hallucination Guardrail**: If the knowledge base does not contain sufficient evidence, the system explicitly states that the answer cannot be verified from municipal records.
   - Clickable **Evidence Inspection Modal** showing the exact source text chunk, page number, and similarity score.

4. **Dual Model Support**
   - **Google Gemini Generative AI**: Configurable in the UI Settings modal (`gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`).
   - **Offline Local Grounded Engine**: Instant extractive and synthesized answers directly from ChromaDB without external API dependency.

5. **Knowledge Hub & Ingestion Pipeline**
   - PyMuPDF text parser with page cleaning and section heading extraction.
   - SHA-256 incremental hashing (skips unchanged PDFs).
   - Scanned/image-only PDF detection with status alerts.
   - Live web dashboard for inspecting all 31 documents, chunk counts, and triggering re-indexing.

---

## 🚀 Quick Start

### 1. Launch Both Servers Automatically
Double-click `run.bat` or run:
```powershell
.\run.bat
```

Or start manually:

**Backend (FastAPI on Port 8000):**
```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend (React/Vite on Port 5173):**
```powershell
cd frontend
npm run dev
```

Open your browser to:
- **Frontend Web UI**: [http://localhost:5173](http://localhost:5173)
- **Backend Swagger API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Direct Unified UI**: [http://localhost:8000](http://localhost:8000)

---

## 📂 Directory Structure

```
RAG_grievance/
├── knowledge_base/
│   ├── pdfs/                 # 31 Official Municipal PDFs
│   ├── chroma_db/            # Persistent ChromaDB vector index (5,158 chunks)
│   └── index_manifest.json   # Hashed metadata & incremental index manifest
├── backend/
│   ├── app.py                # FastAPI REST API & static SPA server
│   ├── config.py             # Configuration paths & LLM settings
│   ├── ingestion.py          # PyMuPDF parser, section detection, incremental chunker
│   ├── rag_engine.py         # Vector retrieval, grounding guardrail, Gemini/local synthesis
│   ├── models.py             # Pydantic schemas (Query, Citations, DocumentMeta)
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── index.html            # HTML shell with Google Fonts
│   ├── package.json          # React 18, Vite 5, Lucide icons
│   ├── vite.config.js        # Port 5173 & API proxy to port 8000
│   └── src/
│       ├── App.jsx           # Main state orchestrator
│       ├── index.css         # Glassmorphic, dark slate navy design system
│       ├── api/ragApi.js     # Backend API client
│       └── components/
│           ├── Navbar.jsx           # Role switcher, chunk stats, modal buttons
│           ├── ChatInterface.jsx    # Messages, suggested queries, grounded badges
│           ├── CitationCard.jsx     # Clickable citation chip
│           ├── EvidenceModal.jsx    # Exact PDF text excerpt viewer
│           ├── DocumentHub.jsx      # 31-document inventory & stats table
│           ├── SettingsModal.jsx    # Gemini API Key & Top-K config
│           └── IngestionDrawer.jsx  # Live pipeline progress & re-index actions
└── run.bat                   # Single-click Windows launcher
```
