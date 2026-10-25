import React from 'react';
import { FileText, Bookmark, ExternalLink } from 'lucide-react';

export default function CitationCard({ citation, onInspect }) {
  return (
    <button
      type="button"
      className="citation-chip"
      onClick={() => onInspect(citation)}
      title={`Inspect exact text from ${citation.doc_name} (Page ${citation.page_num})`}
    >
      <FileText size={14} color="#60a5fa" />
      <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {citation.doc_name}
      </span>
      <span className="citation-page-badge">
        p.{citation.page_num}
      </span>
      <span className="citation-match-score">
        {citation.relevance_score}%
      </span>
      <ExternalLink size={12} color="var(--text-muted)" />
    </button>
  );
}
