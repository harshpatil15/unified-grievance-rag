@echo off
title CivicFix AI - Municipal Grievance RAG Portal
echo =====================================================================
echo           CIVICFIX AI - MUNICIPAL GRIEVANCE RAG SYSTEM
echo =====================================================================
echo [INFO] Knowledge Base: 31 Official Municipal PDFs (5,158 Chunks Indexed)
echo [INFO] Launching FastAPI Backend on http://localhost:8000 ...
start "CivicFix RAG Backend" cmd /k "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload"

echo [INFO] Launching Vite Frontend on http://localhost:5173 ...
start "CivicFix RAG Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo Both servers are starting!
echo  - Frontend Web UI:  http://localhost:5173
echo  - Backend API Docs: http://localhost:8000/docs
echo =====================================================================
echo Press any key to exit this launcher window...
pause >nul
