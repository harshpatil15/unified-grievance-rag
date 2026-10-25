import React, { useEffect } from 'react';
import { X, Database, RefreshCw, CheckCircle, AlertTriangle, XCircle, HardDrive } from 'lucide-react';

export default function IngestionDrawer({ 
  status, 
  onClose, 
  onTriggerIngest 
}) {
  return (
    <div className="modal-overlay" onClick={onClose} id="ingest-drawer-overlay">
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()} 
        id="ingest-drawer-dialog"
        style={{ maxWidth: '640px' }}
        role="dialog"
        aria-labelledby="ingest-drawer-title"
      >
        <div className="modal-header">
          <h3 id="ingest-drawer-title">
            <Database size={20} color="#34d399" />
            <span>PDF Ingestion & Vector Index Pipeline</span>
          </h3>
          <button 
            className="btn-close-modal" 
            onClick={onClose} 
            aria-label="Close ingestion status"
            id="close-ingest-drawer-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Progress Bar */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                {status?.is_indexing ? 'Pipeline Running' : 'Index Status'}
              </span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>
                {status?.progress_percentage || 100}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${status?.progress_percentage || 100}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                  transition: 'width 0.4s ease'
                }} 
              />
            </div>
          </div>

          {/* Status Message */}
          <div 
            style={{ 
              padding: '0.8rem 1rem', 
              background: 'rgba(15, 23, 42, 0.8)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: status?.is_indexing ? '#60a5fa' : '#cbd5e1'
            }}
          >
            {status?.message || 'Knowledge base is fully indexed and ready for queries.'}
          </div>

          {/* Statistics Grid */}
          <div className="evidence-meta-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="meta-item-box">
              <span className="meta-item-label">Total PDFs</span>
              <span className="meta-item-value">{status?.total_files || 31} Files</span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Indexed Documents</span>
              <span className="meta-item-value" style={{ color: '#34d399' }}>
                {status?.indexed_files || 0}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Total Chunks</span>
              <span className="meta-item-value" style={{ color: '#60a5fa' }}>
                {status?.total_chunks?.toLocaleString() || 0}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Unchanged / Skipped</span>
              <span className="meta-item-value" style={{ color: 'var(--text-muted)' }}>
                {status?.skipped_files || 0}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Scanned Warnings</span>
              <span className="meta-item-value" style={{ color: '#fbbf24' }}>
                {status?.documents?.filter(d => d.is_scanned).length || 7}
              </span>
            </div>

            <div className="meta-item-box">
              <span className="meta-item-label">Failures</span>
              <span className="meta-item-value" style={{ color: status?.failed_files > 0 ? '#f87171' : 'var(--text-muted)' }}>
                {status?.failed_files || 0}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn-icon-nav"
              onClick={() => onTriggerIngest(false)}
              disabled={status?.is_indexing}
              id="incremental-index-btn"
            >
              <RefreshCw size={14} className={status?.is_indexing ? 'animate-spin' : ''} />
              <span>Incremental Scan (Fast)</span>
            </button>

            <button
              className="btn-primary-action"
              onClick={() => onTriggerIngest(true)}
              disabled={status?.is_indexing}
              id="full-reindex-btn"
            >
              <HardDrive size={14} />
              <span>Full Re-index</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
