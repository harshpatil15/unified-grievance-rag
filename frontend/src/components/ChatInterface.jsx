import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Filter, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import CitationCard from './CitationCard';

export default function ChatInterface({ 
  role, 
  messages, 
  onSendMessage, 
  loading, 
  onInspectCitation,
  selectedDocFilter,
  setSelectedDocFilter
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const citizenPrompts = [
    "What is the official SLA turnaround time for resolving citizen complaints in CivicFix?",
    "How does a citizen escalate an unresolved grievance under the Right to Services (RTS) Act?",
    "What are the guidelines for garbage and solid waste management grievances in Ward A?",
    "How can a citizen register or rectify a birth and death certificate?"
  ];

  const officerPrompts = [
    "What are the executive powers of the Municipal Commissioner under the MMC Act?",
    "What are the statutory rules and notices for unauthorized structures under MMC Act 1888?",
    "What are the item specifications and rates defined in ROADS USOR 2023?",
    "What are the officer responsibilities outlined in RTI Manual 17 for SWM Ward A?"
  ];

  const suggestedPrompts = role === 'citizen' ? citizenPrompts : officerPrompts;

  return (
    <div className="chat-section" id="chat-section-container">
      {/* Role Banner */}
      <div className={`role-hero-banner ${role}`}>
        <div className="hero-text-group">
          <h2>
            {role === 'citizen' ? 'Citizen Grievance & SLA Assistant' : 'Officer Resolution Copilot'}
          </h2>
          <p>
            {role === 'citizen' 
              ? 'Get verified SLA turnaround times, filing workflows, RTI/RTS rights, and ward contact guidelines.'
              : 'Audit legal clauses (MMC Act 1888/1949), USOR item rates, officer jurisdiction, and compliance rules.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--text-muted)" />
          <select
            id="department-filter"
            className="department-filter-select"
            value={selectedDocFilter || ''}
            onChange={(e) => setSelectedDocFilter(e.target.value || null)}
            aria-label="Filter by knowledge base document"
          >
            <option value="">All 31 Municipal Documents</option>
            <option value="CivicFix_AI_How_the_Grievance_System_Works.pdf">CivicFix AI Working Guide</option>
            <option value="CivicFix_AI_Government_Grievance_Portal_User_Guide.pdf">CivicFix Portal User Guide</option>
            <option value="citizens_charter_in_english.pdf">Citizens Charter (English)</option>
            <option value="grievance_manual.pdf">Grievance Manual</option>
            <option value="Maharashtra Municipal Corporations Act.pdf">Maharashtra Municipal Corporations Act</option>
            <option value="3 The Mumbai municipal Corporation Act 1888.pdf">Mumbai Municipal Corporation Act 1888</option>
            <option value="ROADS USOR 2023.pdf">Roads USOR 2023</option>
            <option value="rts-act-english_1.pdf">Right to Services (RTS) Act</option>
            <option value="RTI  17 Manual for AE SWM A ward.pdf">RTI SWM A Ward Manual</option>
            <option value="RTI 17 Manual AE MAINT A Ward.pdf">RTI AE Maintenance A Ward</option>
            <option value="BMC ENGLISH ESR 2025-26.pdf">BMC English ESR 2025-26</option>
          </select>
        </div>
      </div>

      {/* Message List */}
      <div className="messages-container" id="chat-messages-container">
        {messages.length === 0 ? (
          <div className="welcome-empty-state">
            <div className="welcome-icon-large">
              {role === 'citizen' ? <ShieldCheck size={30} /> : <Sparkles size={30} />}
            </div>
            <h3>
              {role === 'citizen' 
                ? 'How can we help resolve your civic issue?' 
                : 'Welcome to Officer Resolution Copilot'}
            </h3>
            <p>
              Ask any question grounded directly in the 31 indexed municipal acts, 
              citizen charters, RTI manuals, and grievance circulars. Every answer includes verifiable 
              PDF citations and page references.
            </p>

            <div className="suggested-prompts-title">
              Verified Knowledge Base Queries
            </div>

            <div className="prompt-chips-grid">
              {suggestedPrompts.map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="prompt-chip-btn"
                  onClick={() => onSendMessage(promptText)}
                >
                  <span>{promptText}</span>
                  <ArrowRight size={15} style={{ flexShrink: 0, opacity: 0.6 }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message-row ${msg.sender}`}
              id={`message-${index}`}
            >
              <div className={`message-avatar ${msg.sender === 'assistant' ? role : ''}`}>
                {msg.sender === 'user' ? (
                  <User size={18} />
                ) : role === 'citizen' ? (
                  <ShieldCheck size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
              </div>

              <div className="message-bubble-wrapper">
                {msg.sender === 'assistant' && (
                  <div className="message-meta-header">
                    {msg.is_grounded ? (
                      <span className="badge-grounded">
                        <CheckCircle2 size={12} /> Grounded in Official PDFs
                      </span>
                    ) : (
                      <span className="badge-unverified">
                        <AlertCircle size={12} /> Unverified In Documents
                      </span>
                    )}

                    {msg.llm_used && (
                      <span className="badge-llm">
                        Engine: {msg.llm_used}
                      </span>
                    )}
                  </div>
                )}

                <div className="message-bubble">
                  {/* Clean Markdown rendering */}
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    if (paragraph.startsWith('### ')) {
                      return <h3 key={pIdx}>{paragraph.replace('### ', '')}</h3>;
                    }
                    if (paragraph.startsWith('> ')) {
                      return <blockquote key={pIdx}>{paragraph.replace(/^>\s*/gm, '')}</blockquote>;
                    }
                    if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                      const items = paragraph.split('\n').filter(Boolean);
                      return (
                        <ul key={pIdx}>
                          {items.map((it, iIdx) => (
                            <li key={iIdx}>{it.replace(/^[-*]\s*/, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={pIdx} style={{ marginBottom: '0.6rem' }}>{paragraph}</p>;
                  })}

                  {/* Attached Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="citations-block">
                      <div className="citations-block-title">
                        <BookOpen size={13} color="#60a5fa" />
                        <span>Source Citations ({msg.citations.length} Excerpts)</span>
                      </div>
                      <div className="citation-chips-container">
                        {msg.citations.map((c, cIdx) => (
                          <CitationCard
                            key={cIdx}
                            citation={c}
                            onInspect={onInspectCitation}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="message-row assistant">
            <div className={`message-avatar ${role}`}>
              {role === 'citizen' ? <ShieldCheck size={18} /> : <Sparkles size={18} />}
            </div>
            <div className="message-bubble-wrapper">
              <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  Searching 5,158 ChromaDB chunks & synthesizing evidence...
                </span>
                <div className="typing-dots">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="input-form-wrapper">
          <input
            ref={inputRef}
            id="chat-query-input"
            type="text"
            className="chat-input-field"
            placeholder={
              role === 'citizen'
                ? "Ask about filing grievances, SLAs, ward rules, RTS escalations..."
                : "Query MMC Act sections, USOR rates, jurisdictional powers, circulars..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            id="send-query-btn"
            type="submit"
            className="btn-send-message"
            disabled={!input.trim() || loading}
            aria-label="Send query"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
