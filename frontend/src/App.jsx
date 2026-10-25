import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ChatInterface from './components/ChatInterface';
import EvidenceModal from './components/EvidenceModal';
import DocumentHub from './components/DocumentHub';
import SettingsModal from './components/SettingsModal';
import IngestionDrawer from './components/IngestionDrawer';
import { 
  fetchHealth, 
  fetchDocuments, 
  fetchIngestStatus, 
  sendQuery, 
  triggerIngest 
} from './api/ragApi';

export default function App() {
  const [role, setRole] = useState('citizen'); // 'citizen' or 'officer'
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Knowledge Base State
  const [totalChunks, setTotalChunks] = useState(5158);
  const [totalDocs, setTotalDocs] = useState(31);
  const [documents, setDocuments] = useState([]);
  const [selectedDocFilter, setSelectedDocFilter] = useState(null);
  
  // Modals & Drawers
  const [activeCitation, setActiveCitation] = useState(null);
  const [isDocHubOpen, setIsDocHubOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestStatus, setIngestStatus] = useState(null);

  // Initial Data Fetch
  useEffect(() => {
    loadHealthAndDocs();
  }, []);

  const loadHealthAndDocs = async () => {
    try {
      const [health, docsData, statusData] = await Promise.all([
        fetchHealth().catch(() => ({ total_chunks: 5158 })),
        fetchDocuments().catch(() => ({ total_documents: 31, documents: [] })),
        fetchIngestStatus().catch(() => null)
      ]);

      if (health.total_chunks) setTotalChunks(health.total_chunks);
      if (docsData.total_documents) setTotalDocs(docsData.total_documents);
      if (docsData.documents) setDocuments(docsData.documents);
      if (statusData) setIngestStatus(statusData);
    } catch (err) {
      console.error('Error initializing portal data:', err);
    }
  };

  const handleSendMessage = async (text) => {
    const userMsg = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendQuery({
        query: text,
        role,
        top_k: 5,
        filter_doc: selectedDocFilter
      });

      const assistantMsg = {
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        is_grounded: res.is_grounded,
        llm_used: res.llm_used,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        sender: 'assistant',
        text: `Error connecting to RAG service: ${err.message}. Please verify the FastAPI backend is running on port 8000.`,
        citations: [],
        is_grounded: false,
        llm_used: 'Error Handler',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReindex = async (force = false) => {
    try {
      const report = await triggerIngest(force);
      setIngestStatus(report);
      setIsIngestOpen(true);
      
      // Poll progress every 1.5 seconds while indexing
      const interval = setInterval(async () => {
        try {
          const current = await fetchIngestStatus();
          setIngestStatus(current);
          if (!current.is_indexing) {
            clearInterval(interval);
            loadHealthAndDocs();
          }
        } catch (e) {
          clearInterval(interval);
        }
      }, 1500);
    } catch (err) {
      alert(`Ingestion trigger failed: ${err.message}`);
    }
  };

  return (
    <div className="app-container" id="civicfix-rag-app">
      <Navbar
        role={role}
        setRole={setRole}
        totalChunks={totalChunks}
        totalDocs={totalDocs}
        onOpenDocHub={() => setIsDocHubOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenIngest={() => setIsIngestOpen(true)}
      />

      <main className="main-layout">
        <ChatInterface
          role={role}
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          onInspectCitation={(citation) => setActiveCitation(citation)}
          selectedDocFilter={selectedDocFilter}
          setSelectedDocFilter={setSelectedDocFilter}
        />
      </main>

      {/* Modals & Inspection Drawers */}
      {activeCitation && (
        <EvidenceModal
          citation={activeCitation}
          onClose={() => setActiveCitation(null)}
        />
      )}

      {isDocHubOpen && (
        <DocumentHub
          documents={documents}
          totalChunks={totalChunks}
          onClose={() => setIsDocHubOpen(false)}
          onTriggerReindex={handleTriggerReindex}
          isIndexing={ingestStatus?.is_indexing}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSettingsSaved={loadHealthAndDocs}
        />
      )}

      {isIngestOpen && (
        <IngestionDrawer
          status={ingestStatus}
          onClose={() => setIsIngestOpen(false)}
          onTriggerIngest={handleTriggerReindex}
        />
      )}
    </div>
  );
}
