const API_BASE = 'https://ofxmxllxnkmdcbutnnhy.supabase.co/functions/v1/api'

export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options)
}
