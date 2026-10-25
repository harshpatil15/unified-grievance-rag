const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health status');
  return res.json();
}

export async function sendQuery({ query, role = 'citizen', top_k = 5, filter_doc = null, api_key = null }) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, role, top_k, filter_doc, api_key })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to execute query');
  }
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents list');
  return res.json();
}

export async function triggerIngest(force = false) {
  const res = await fetch(`${API_BASE}/ingest?force=${force}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to trigger ingestion');
  return res.json();
}

export async function fetchIngestStatus() {
  const res = await fetch(`${API_BASE}/ingest/status`);
  if (!res.ok) throw new Error('Failed to fetch ingestion status');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
