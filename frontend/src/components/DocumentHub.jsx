import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileWarning, 
  Layers,
  Database
} from 'lucide-react';

export default function DocumentHub({ 
  documents, 
  totalChunks, 
  onClose, 
  onTriggerReindex, 
  isIndexing 
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredDocs = useMemo(() => {
    return (documents || []).filter(doc => {
      const matchSearch = doc.filename.toLowerCase().includes(search.toLowerCase());
      if (filterStatus === 'all') return matchSearch;
      if (filterStatus === 'indexed') return matchSearch && doc.status === 'indexed';
      if (filterStatus === 'scanned') return matchSearch && (doc.is_scanned || doc.status === 'scanned_warning');
      return matchSearch;
    });
  }, [documents, search, filterStatus]);

  const totalPages = useMemo(() => {
    return (documents || []).reduce((acc, d) => acc + (d.page_count || 0), 0);
  }, [documents]);

  const scannedCount = useMemo(() => {
    return (documents || []).filter(d => d.is_scanned || d.status === 'scanned_warning').length;
  }, [documents]);

  return (
    <div className="modal-overlay" onClick={onClose} id="doc-hub-overlay">
      <div 
        className="modal-dialog doc-hub-modal" 
        onClick={(e) => e.stopPropagation()} 
        id="doc-hub-dialog"
        role="dialog"
        aria-labelledby="doc-hub-title"
      >
        <div className="modal-header">
          <h3 id="doc-hub-title">
            <Database size={20} color="#60a5fa" />
            <span>Municipal Knowledge Base Documents (31 Official PDFs)</span>
          </h3>
          <button 
            className="btn-close-modal" 
            onClick={onClose} 
            aria-label="Close modal"
            id="close-doc-hub-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Summary KPI Strip */}
          <div className="evidence-meta-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="meta-item-box">
              <span className="meta-item-label">Total Documents</span>
              <span className="meta-item-value">{documents?.length || 31} PDFs</span>
            </div>
            <div className="meta-item-box">
              <span className="meta-item-label">Indexed Chunks</span>
              <span className="meta-item-value" style={{ color: '#34d399' }}>
                {totalChunks?.toLocaleString() || '5,158'}
              </span>
            </div>
            <div className="meta-item-box">
              <span className="meta-item-label">Total Pages</span>
              <span className="meta-item-value" style={{ color: '#60a5fa' }}>
                {totalPages.toLocaleString()} Pages
              </span>
            </div>
            <div className="meta-item-box">
              <span className="meta-item-label">Scanned / OCR Flagged</span>
              <span className="meta-item-value" style={{ color: '#fbbf24' }}>
                {scannedCount} Documents
              </span>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="doc-hub-toolbar">
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="doc-search-input"
                type="text"
                className="search-input-field"
                placeholder="Search PDF by name (e.g., CivicFix, MMC Act, RTI, SWM, USOR)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn-icon-nav ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
                style={{ background: filterStatus === 'all' ? 'var(--bg-card-hover)' : 'transparent' }}
              >
                All ({documents?.length || 0})
              </button>
              <button
                className={`btn-icon-nav ${filterStatus === 'indexed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('indexed')}
                style={{ background: filterStatus === 'indexed' ? 'var(--bg-card-hover)' : 'transparent' }}
              >
                Text-Rich ({documents?.filter(d => d.status === 'indexed').length || 0})
              </button>
              <button
                className={`btn-icon-nav ${filterStatus === 'scanned' ? 'active' : ''}`}
                onClick={() => setFilterStatus('scanned')}
                style={{ background: filterStatus === 'scanned' ? 'var(--bg-card-hover)' : 'transparent' }}
              >
                Scanned ({scannedCount})
              </button>
            </div>

            <button
              id="force-reindex-btn"
              className="btn-primary-action"
              style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
              onClick={() => onTriggerReindex(true)}
              disabled={isIndexing}
            >
              <RefreshCw size={14} className={isIndexing ? 'animate-spin' : ''} />
              <span>{isIndexing ? 'Indexing...' : 'Force Re-index'}</span>
            </button>
          </div>

          {/* Table of Documents */}
          <div className="doc-table-wrapper">
            <table className="doc-table" id="documents-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Document Name</th>
                  <th>Size</th>
                  <th>Pages</th>
                  <th>Chunks</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, idx) => (
                  <tr key={doc.filename}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: '#f1f5f9' }} title={doc.filename}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <FileText size={15} color="#60a5fa" />
                        <span style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{doc.file_size_mb} MB</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{doc.page_count}</td>
                    <td style={{ fontWeight: 600, color: doc.chunk_count > 0 ? '#34d399' : 'var(--text-muted)' }}>
                      {doc.chunk_count}
                    </td>
                    <td>
                      {doc.is_scanned ? (
                        <span style={{ color: '#fbbf24', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <AlertTriangle size={12} /> Scanned
                        </span>
                      ) : (
                        <span style={{ color: '#34d399', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={12} /> Digital
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-tag ${doc.status}`}>
                        {doc.status === 'indexed' && 'Indexed'}
                        {doc.status === 'scanned_warning' && 'Scanned Notice'}
                        {doc.status === 'skipped' && 'Unchanged'}
                        {doc.status === 'failed' && 'Error'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
