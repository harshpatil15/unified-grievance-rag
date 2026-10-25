import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PDF_DIR = BASE_DIR / "knowledge_base" / "pdfs"
CHROMA_DIR = BASE_DIR / "knowledge_base" / "chroma_db"
MANIFEST_FILE = BASE_DIR / "knowledge_base" / "index_manifest.json"
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE)

# Configuration settings
COLLECTION_NAME = "grievance_knowledge_base"
DEFAULT_CHUNK_SIZE = 1200
DEFAULT_CHUNK_OVERLAP = 250
DEFAULT_TOP_K = 5

class AppConfig:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))

config = AppConfig()
