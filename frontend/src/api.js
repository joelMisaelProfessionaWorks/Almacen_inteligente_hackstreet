const API_BASE = 'http://localhost:8000';

export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let err = 'API Error';
    try {
      const data = await res.json();
      err = data.detail || data.error || err;
    } catch (e) {
      // ignore
    }
    throw new Error(err);
  }

  if (res.status === 204) return null;
  return res.json();
}
