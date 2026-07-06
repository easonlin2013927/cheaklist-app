/**
 * API client for communicating with Pages Functions.
 */

const API_BASE = '/api'

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  // Attach auth token if available
  const token = localStorage.getItem('checklist-token')
  if (token && !path.startsWith('/auth/')) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Token expired or invalid
    if (res.status === 401) {
      localStorage.removeItem('checklist-token')
      localStorage.removeItem('checklist-userId')
      window.dispatchEvent(new CustomEvent('auth-required'))
    }
    throw new Error(data?.error || 'Request failed')
  }

  return data
}

export const api = {
  register: (email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),

  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),

  logout: () => {
    localStorage.removeItem('checklist-token')
    localStorage.removeItem('checklist-userId')
    window.dispatchEvent(new CustomEvent('auth-required'))
  },

  getData: () => request('/data'),

  saveData: (data) => request('/data', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteData: () => request('/data', { method: 'DELETE' }),

  me: () => request('/me'),
}
