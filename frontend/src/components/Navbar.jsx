import React from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  Settings as SettingsIcon, 
  Database,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  role, 
  setRole, 
  totalChunks, 
  totalDocs,
  onOpenDocHub, 
  onOpenSettings,
  onOpenIngest
}) {
  return (
    <header className="navbar" id="main-navbar">
      <div className="nav-brand">
        <div className="brand-icon-wrapper">
          <ShieldCheck size={24} />
        </div>
        <div className="brand-title-group">
          <h1>CivicFix AI <span style={{ color: '#60a5fa' }}>RAG</span></h1>
          <span className="brand-subtitle">Municipal Grievance Resolution & Policy Intelligence</span>
        </div>
      </div>

      {/* Role Toggle Switch */}
      <div className="role-switch-container" role="tablist" aria-label="Operating Role">
        <button
          id="role-btn-citizen"
          className={`role-pill ${role === 'citizen' ? 'active citizen' : ''}`}
          onClick={() => setRole('citizen')}
          type="button"
          aria-selected={role === 'citizen'}
        >
          <UserCheck size={16} />
          <span>Citizen Assistant</span>
        </button>

        <button
          id="role-btn-officer"
          className={`role-pill ${role === 'officer' ? 'active officer' : ''}`}
          onClick={() => setRole('officer')}
          type="button"
          aria-selected={role === 'officer'}
        >
          <Sparkles size={16} />
          <span>Officer Copilot</span>
        </button>
      </div>

      {/* Actions & Status */}
      <div className="nav-actions">
        <div 
          className="status-badge-chip" 
          title="Active vector database status"
          id="kb-status-chip"
        >
          <span className="pulsing-dot"></span>
          <span>{totalChunks.toLocaleString()} Chunks ({totalDocs} Docs)</span>
        </div>

        <button
          id="btn-doc-hub"
          className="btn-icon-nav"
          onClick={onOpenDocHub}
          title="Browse all 31 Municipal PDFs and index metadata"
        >
          <FileText size={16} />
          <span>Knowledge Hub</span>
        </button>

        <button
          id="btn-ingest-status"
          className="btn-icon-nav"
          onClick={onOpenIngest}
          title="View pipeline status and trigger re-index"
        >
          <Database size={16} />
          <span>Ingestion</span>
        </button>

        <button
          id="btn-settings"
          className="btn-icon-nav"
          onClick={onOpenSettings}
          title="Configure Gemini API Key & Retrieval Top-K"
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
