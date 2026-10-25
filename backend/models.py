from typing import List, Optional
from pydantic import BaseModel, Field

class Citation(BaseModel):
    doc_name: str
    page_num: int
    section: str = "General"
    chunk_id: str
    snippet: str
    relevance_score: float

class QueryRequest(BaseModel):
    query: str
    role: str = Field(default="citizen", description="Role: 'citizen' or 'officer'")
    top_k: int = Field(default=5, ge=1, le=15)
    filter_doc: Optional[str] = None
    api_key: Optional[str] = None

class QueryResponse(BaseModel):
    query: str
    role: str
    answer: str
    citations: List[Citation]
    evidence_count: int
    is_grounded: bool
    llm_used: str

class DocumentMetadata(BaseModel):
    filename: str
    file_size_mb: float
    page_count: int
    chunk_count: int
    is_scanned: bool
    file_hash: str
    status: str  # indexed, skipped, scanned_warning, failed
    last_indexed: Optional[str] = None
    error_message: Optional[str] = None

class IngestionReport(BaseModel):
    total_files: int
    indexed_files: int
    skipped_files: int
    failed_files: int
    total_chunks: int
    is_indexing: bool = False
    progress_percentage: float = 100.0
    documents: List[DocumentMetadata] = []
    message: str = ""

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    top_k: Optional[int] = None
