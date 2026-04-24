import { enqueue, flushQueue } from '../offline/queue'

// In production, VITE_API_URL is the full Render backend URL e.g. https://robo-trainer-api.onrender.com/api
// In dev, it's unset and calls go through Vite's proxy as /api/...
const BASE = import.meta.env.VITE_API_URL ?? '/api'

function getToken() {
  return localStorage.getItem('rt_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...(options.headers || {})
      }
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status })
    }
    if (res.status === 204) return null
    return res.json()
  } catch (err) {
    // Queue POST/PUT requests when offline (not GETs — we can't return stale data here)
    const QUEUEABLE_METHODS = ['POST', 'PUT']
    if (QUEUEABLE_METHODS.includes(options.method) && !navigator.onLine) {
      await enqueue({ path, body: options.body ? JSON.parse(options.body) : null, method: options.method })
      return { _queued: true }
    }
    throw err
  }
}

// Flush queued requests when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue((path, body, method) =>
      request(path, { method, body: body ? JSON.stringify(body) : undefined })
    )
  })
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
