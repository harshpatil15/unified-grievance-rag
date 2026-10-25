import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Key, Eye, EyeOff, Cpu, Sliders, Check, AlertCircle } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api/ragApi';

export default function SettingsModal({ onClose, onSettingsSaved }) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState('gemini-1.5-flash');
  const [topK, setTopK] = useState(5);
  const [isConfigured, setIsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setIsConfigured(data.gemini_api_key_configured);
        setModel(data.gemini_model || 'gemini-1.5-flash');
        setTopK(data.top_k || 5);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        gemini_model: model,
        top_k: Number(topK)
      };
      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey.trim();
      }
      await updateSettings(payload);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setIsConfigured(Boolean(apiKey.trim() || isConfigured));
      if (onSettingsSaved) onSettingsSaved();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="settings-modal-overlay">
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()} 
        id="settings-modal-dialog"
        style={{ maxWidth: '560px' }}
        role="dialog"
        aria-labelledby="settings-modal-title"
      >
        <div className="modal-header">
          <h3 id="settings-modal-title">
            <SettingsIcon size={20} color="#60a5fa" />
            <span>RAG System & LLM Settings</span>
          </h3>
          <button 
            className="btn-close-modal" 
            onClick={onClose} 
            aria-label="Close settings"
            id="close-settings-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body settings-form">
          {message && (
            <div 
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: message.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="gemini-api-key-input">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={14} color="#60a5fa" />
                Google Gemini API Key
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="gemini-api-key-input"
                type={showApiKey ? 'text' : 'password'}
                className="form-input"
                style={{ width: '100%', paddingRight: '2.5rem' }}
                placeholder={isConfigured ? 'API Key configured (enter new key to replace)' : 'Enter AIzaSy...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="form-help">
              {isConfigured ? 'Status: Active key in backend/env. Enter new key if you wish to override.' : 'Optional: If left blank, the system runs local grounded synthesis.'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="model-select">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={14} color="#a78bfa" />
                Gemini Model
              </span>
            </label>
            <select
              id="model-select"
              className="form-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Active & Recommended - Fast & Grounded)</option>
              <option value="gemini-3.8-flash-lite">Gemini 3.8 Flash-Lite (High Quota / Fast)</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Legal & Act Reasoning)</option>
            </select>
            <span className="form-help">Selected model for grounded synthesis of retrieved PDF evidence.</span>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="top-k-slider">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sliders size={14} color="#34d399" />
                  Evidence Retrieval Top-K: {topK}
                </span>
              </label>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>
                {topK} Chunks
              </span>
            </div>
            <input
              id="top-k-slider"
              type="range"
              min="2"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--citizen-primary)', cursor: 'pointer' }}
            />
            <span className="form-help">Number of relevant chunks retrieved per query from the 31 indexed PDFs.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-icon-nav"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              id="save-settings-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
