import React, { useEffect, useState } from 'react';
import { X, FileText, Bookmark, Hash, Percent, Copy, Check } from 'lucide-react';

export default function EvidenceModal({ citation, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="evidence-modal-overlay">
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()} 
        id="evidence-modal-dialog"
        role="dialog"
        aria-labelledby="evidence-modal-title"
      >
        <div className="modal-header">
          <h3 id="evidence-modal-title">
            <FileText size={20} color="#60a5fa" />
            <span>Retrieved Evidence Excerpt</span>
          </h3>
          <button 
            className="btn-close-modal" 
            onClick={onClose} 
            aria-label="Close modal"
            id="close-evidence-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="evidence-meta-grid">
            <div className="meta-item-box">
              <span className="meta-item-label">Source Document</span>
              <span className="meta-item-value" title={citation.doc_name}>
                {citation.doc_name}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Page Number</span>
              <span className="meta-item-value" style={{ color: '#60a5fa' }}>
                Page {citation.page_num}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Section / Clause</span>
              <span className="meta-item-value" style={{ color: '#a78bfa' }}>
                {citation.section || 'General'}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Match Relevance</span>
              <span className="meta-item-value" style={{ color: '#34d399' }}>
                {citation.relevance_score}%
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Exact PDF Text Excerpt
              </span>
              <button 
                onClick={handleCopy}
                className="btn-icon-nav"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                id="copy-excerpt-btn"
              >
                {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Excerpt'}</span>
              </button>
            </div>
            
            <div className="evidence-excerpt-card" id="evidence-text-content">
              {citation.snippet}
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Hash size={13} />
            <span>Chunk ID: {citation.chunk_id || `${citation.doc_name}#p${citation.page_num}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
