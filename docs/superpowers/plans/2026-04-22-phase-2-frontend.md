# Robo Trainer 3000 — Phase 2: React PWA Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React PWA — auth screens, app shell, workout logging (solo + shared side-by-side), wellness check-in, dashboard with charts, stats views, partner view, settings, and offline queue.

**Architecture:** Vite + React + React Router v6. Auth state lives in React Context with JWT stored in localStorage. API calls go through a central client that injects auth headers and queues failed requests in IndexedDB when offline. Charts use Recharts. Dark theme, no emojis, all-caps labels per design spec.

**Tech Stack:** React, Vite, React Router v6, Recharts, idb, vite-plugin-pwa, Vitest, React Testing Library

**Prerequisite:** Phase 1 backend must be running on `http://localhost:3001`.

**Checkpoint:** Phase 2 is complete when the app installs as a PWA, Joe and Sydney can each log in, log workouts (including shared side-by-side), log wellness, and view the dashboard and stats — all working offline.

---

## File Map

```
client/
├── package.json
├── vite.config.js
├── index.html
├── public/
│   ├── manifest.json
│   └── icon-192.png                     # PWA icon (placeholder ok for dev)
└── src/
    ├── main.jsx                          # ReactDOM.render + Router + AuthProvider
    ├── App.jsx                           # Route definitions
    ├── api/
    │   └── client.js                     # fetch wrapper: auth headers, offline queue
    ├── context/
    │   └── AuthContext.jsx               # currentUser, token, login(), logout()
    ├── hooks/
    │   ├── useApi.js                     # generic data fetch hook
    │   ├── useWorkouts.js                # workout CRUD
    │   ├── useWellness.js                # wellness CRUD
    │   └── useStats.js                   # stats + PRs
    ├── components/
    │   ├── BottomNav.jsx                 # 4-tab bottom navigation
    │   ├── FAB.jsx                       # floating + button
    │   ├── LogSheet.jsx                  # bottom sheet: type + who picker
    │   ├── StatCard.jsx                  # reusable metric card
    │   ├── SparkBar.jsx                  # mini bar chart (dashboard strength card)
    │   └── DualLineChart.jsx             # pain + energy line chart
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── AcceptInvite.jsx
    │   ├── Dashboard.jsx
    │   ├── Stats.jsx
    │   ├── Partner.jsx
    │   └── Settings.jsx
    ├── screens/
    │   ├── WorkoutLogger.jsx             # solo workout logging
    │   ├── SharedWorkoutLogger.jsx       # side-by-side shared logging
    │   └── WellnessLogger.jsx
    └── offline/
        └── queue.js                      # IndexedDB offline request queue
```

---

## Task 1: Vite + PWA Scaffold

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/public/manifest.json`
- Create: `client/src/main.jsx`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "robo-trainer-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "idb": "^8.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3",
    "recharts": "^2.12.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^15.0.2",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.2.1",
    "jsdom": "^24.0.0",
    "vite": "^5.2.8",
    "vite-plugin-pwa": "^0.19.8",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Install client dependencies**

```bash
cd client && npm install
```

- [ ] **Step 3: Create `client/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we use public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:3001\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 }
          }
        ]
      }
    })
  ],
  server: {
    proxy: { '/api': 'http://localhost:3001' }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true
  }
})
```

- [ ] **Step 4: Create `client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/icon-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <meta name="theme-color" content="#0f0f1a" />
    <link rel="manifest" href="/manifest.json" />
    <title>Robo Trainer</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #0f0f1a;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-height: 100vh;
        -webkit-tap-highlight-color: transparent;
      }
      #root { min-height: 100vh; display: flex; flex-direction: column; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `client/public/manifest.json`**

```json
{
  "name": "Robo Trainer 3000",
  "short_name": "RoboTrainer",
  "description": "Phone-first fitness tracker for chronic pain warriors",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#0f0f1a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-192.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 6: Create placeholder icon**

```bash
# Creates a simple 192x192 purple square as a placeholder icon
# Replace with real icon before shipping
node -e "
const { createCanvas } = require('canvas')
" 2>/dev/null || true
# If canvas not available, just create an empty file — browsers handle missing icons gracefully
touch client/public/icon-192.png
```

- [ ] **Step 7: Create `client/src/test-setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Verify Vite starts**

```bash
cd client && npm run dev
```

Expected: `Local: http://localhost:5173/` with no errors.

- [ ] **Step 9: Commit**

```bash
git add client/
git commit -m "feat: Vite PWA scaffold with React and Recharts"
```

---

## Task 2: API Client + Auth Context

**Files:**
- Create: `client/src/api/client.js`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/main.jsx`

- [ ] **Step 1: Create `client/src/api/client.js`**

```js
const BASE = '/api'

function getToken() {
  return localStorage.getItem('rt_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Create `client/src/context/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('rt_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(user => setCurrentUser(user))
      .catch(() => localStorage.removeItem('rt_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { token, user } = await api.post('/auth/login', { email, password })
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }

  async function register(name, email, password) {
    const { token, user } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }

  async function acceptInvite(name, email, password, inviteToken) {
    const { token, user } = await api.post('/auth/accept-invite', { name, email, password, inviteToken })
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }

  function logout() {
    localStorage.removeItem('rt_token')
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 3: Create `client/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 4: Enrich `/auth/me` with partner name (backend fix)**

In `server/routes/auth.js`, replace the `GET /me` handler with:

```js
router.get('/me', verifyToken, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.partner_id, u.created_at,
            p.name as partner_name
     FROM users u
     LEFT JOIN users p ON p.id = u.partner_id
     WHERE u.id = $1`,
    [req.user.id]
  )
  res.json(result.rows[0])
})
```

This adds `partner_name` to the session so `LogSheet` and `SharedWorkoutLogger` can display the correct name without an extra API call.

- [ ] **Step 5: Commit**

```bash
git add client/src/ server/routes/auth.js
git commit -m "feat: API client, auth context, enrich /auth/me with partner_name"
```

---

## Task 3: App Shell — Routing, BottomNav, FAB

**Files:**
- Create: `client/src/App.jsx`
- Create: `client/src/components/BottomNav.jsx`
- Create: `client/src/components/FAB.jsx`
- Create: `client/src/components/LogSheet.jsx`
- Create: `client/src/pages/Login.jsx`
- Create: `client/src/pages/Register.jsx`
- Create: `client/src/pages/AcceptInvite.jsx`
- Create: `client/src/pages/Dashboard.jsx` (stub)
- Create: `client/src/pages/Stats.jsx` (stub)
- Create: `client/src/pages/Partner.jsx` (stub)
- Create: `client/src/pages/Settings.jsx` (stub)

- [ ] **Step 1: Create `client/src/App.jsx`**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import Partner from './pages/Partner'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'

const styles = {
  app: { display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto' },
  main: { flex: 1, overflowY: 'auto', paddingBottom: 80 }
}

function ProtectedLayout() {
  return (
    <div style={styles.app}>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { currentUser, loading } = useAuth()
  if (loading) return <div style={{ padding: 24, color: '#666' }}>Loading...</div>
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }
  return <ProtectedLayout />
}
```

- [ ] **Step 2: Create `client/src/components/BottomNav.jsx`**

```jsx
import { NavLink } from 'react-router-dom'
import FAB from './FAB'

const tabs = [
  { to: '/', label: 'Home', icon: '▣' },
  { to: '/stats', label: 'Stats', icon: '↗' },
  { to: '/partner', label: 'Partner', icon: '⊕' },
  { to: '/settings', label: 'Settings', icon: '⚙' }
]

const s = {
  nav: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480,
    background: '#1a1a2e', borderTop: '1px solid #252540',
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    padding: '8px 0 12px', zIndex: 100
  },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 12px', textDecoration: 'none', color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  icon: { fontSize: 18, lineHeight: 1 },
  active: { color: '#7c6af7' }
}

export default function BottomNav() {
  return (
    <nav style={s.nav}>
      {tabs.slice(0, 2).map(tab => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.active : {}) })}>
          <span style={s.icon}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
      <FAB />
      {tabs.slice(2).map(tab => (
        <NavLink key={tab.to} to={tab.to} style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.active : {}) })}>
          <span style={s.icon}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Create `client/src/components/FAB.jsx`**

```jsx
import { useState } from 'react'
import LogSheet from './LogSheet'

const s = {
  btn: {
    width: 52, height: 52, borderRadius: '50%', background: '#7c6af7',
    border: 'none', color: '#fff', fontSize: 28, fontWeight: 300,
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,106,247,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative', zIndex: 101
  }
}

export default function FAB() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button style={s.btn} onClick={() => setOpen(true)} aria-label="Log workout or wellness">+</button>
      {open && <LogSheet onClose={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 4: Create `client/src/components/LogSheet.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' },
  sheet: { background: '#1a1a2e', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxWidth: 480, margin: '0 auto' },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 24 },
  sectionLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 8 },
  row: { display: 'flex', gap: 10, marginBottom: 20 },
  typeBtn: (active) => ({
    flex: 1, padding: '14px 0', borderRadius: 10, border: `2px solid ${active ? '#7c6af7' : 'transparent'}`,
    background: active ? '#7c6af722' : '#252540', color: active ? '#a090ff' : '#888',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center'
  }),
  personBtn: (active, color) => ({
    flex: 1, padding: '12px 0', borderRadius: 10,
    border: `2px solid ${active ? color : 'transparent'}`,
    background: active ? `${color}22` : '#252540',
    color: active ? color : '#888', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', textAlign: 'center', position: 'relative'
  }),
  check: { position: 'absolute', top: 6, right: 10, fontSize: 11 },
  cta: { width: '100%', padding: 14, background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  note: { fontSize: 11, color: '#555', textAlign: 'center', marginTop: 10 }
}

export default function LogSheet({ onClose }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [type, setType] = useState('workout')
  const [forJoe, setForJoe] = useState(true)
  const [forPartner, setForPartner] = useState(false)

  const partnerName = currentUser.partner_name || 'Partner'
  const bothSelected = type === 'workout' && forJoe && forPartner
  const ctaLabel = bothSelected ? 'Start Shared Workout' : type === 'workout' ? 'Start Workout' : 'Log Wellness'

  function handleStart() {
    onClose()
    if (type === 'workout') {
      navigate('/log/workout', { state: { forJoe, forPartner } })
    } else {
      navigate('/log/wellness', { state: { forJoe } })
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.title}>What are you logging?</div>
        <div style={s.subtitle}>Select type and who</div>

        <div style={s.sectionLabel}>Type</div>
        <div style={s.row}>
          <button style={s.typeBtn(type === 'workout')} onClick={() => setType('workout')}>Workout</button>
          <button style={s.typeBtn(type === 'wellness')} onClick={() => setType('wellness')}>Wellness</button>
        </div>

        <div style={s.sectionLabel}>For who? {type === 'workout' ? '(tap to toggle)' : '(wellness is individual)'}</div>
        <div style={s.row}>
          <button style={s.personBtn(forJoe, '#7c6af7')} onClick={() => type === 'workout' ? setForJoe(v => !v) : setForJoe(true)}>
            {forJoe && <span style={s.check}>✓</span>}
            {currentUser.name?.charAt(0) || 'J'}
            <div style={{ fontSize: 11, marginTop: 2 }}>{currentUser.name?.split(' ')[0] || 'You'}</div>
          </button>
          {currentUser.partner_id && (
            <button style={s.personBtn(forPartner, '#f7a76c')} onClick={() => type === 'workout' && setForPartner(v => !v)} disabled={type === 'wellness'}>
              {forPartner && <span style={{ ...s.check, color: '#f7a76c' }}>✓</span>}
              {partnerName.charAt(0)}
              <div style={{ fontSize: 11, marginTop: 2 }}>{partnerName.split(' ')[0]}</div>
            </button>
          )}
        </div>

        {bothSelected && (
          <div style={{ background: '#7c6af722', border: '1px solid #7c6af755', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: '#a090ff', textAlign: 'center' }}>
            Shared workout — log different stats per person
          </div>
        )}

        <button style={s.cta} onClick={handleStart}>{ctaLabel}</button>
        <div style={s.note}>Wellness is always logged individually</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create stub pages**

`client/src/pages/Dashboard.jsx`:
```jsx
export default function Dashboard() {
  return <div style={{ padding: 20, color: '#fff' }}>Dashboard — coming soon</div>
}
```

`client/src/pages/Stats.jsx`:
```jsx
export default function Stats() {
  return <div style={{ padding: 20, color: '#fff' }}>Stats — coming soon</div>
}
```

`client/src/pages/Partner.jsx`:
```jsx
export default function Partner() {
  return <div style={{ padding: 20, color: '#fff' }}>Partner — coming soon</div>
}
```

`client/src/pages/Settings.jsx`:
```jsx
export default function Settings() {
  return <div style={{ padding: 20, color: '#fff' }}>Settings — coming soon</div>
}
```

- [ ] **Step 6: Create auth pages**

`client/src/pages/Login.jsx`:
```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const s = {
  page: { padding: 32, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '60px auto 0' },
  heading: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: 4, display: 'block' },
  input: { width: '100%', background: '#1a1a2e', border: '1px solid #252540', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none' },
  btn: { width: '100%', padding: 14, background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { color: '#f77c6a', fontSize: 13 },
  link: { color: '#7c6af7', fontSize: 13, textAlign: 'center', display: 'block', marginTop: 8 }
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={s.page} onSubmit={handleSubmit}>
      <div style={s.heading}>Robo Trainer</div>
      <div>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <div style={s.error}>{error}</div>}
      <button style={s.btn} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
      <Link to="/register" style={s.link}>Create new account</Link>
    </form>
  )
}
```

`client/src/pages/Register.jsx`:
```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const s = {
  page: { padding: 32, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '40px auto 0' },
  heading: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 },
  sub: { fontSize: 13, color: '#666', marginBottom: 8 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: 4, display: 'block' },
  input: { width: '100%', background: '#1a1a2e', border: '1px solid #252540', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none' },
  btn: { width: '100%', padding: 14, background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { color: '#f77c6a', fontSize: 13 },
  link: { color: '#7c6af7', fontSize: 13, textAlign: 'center', display: 'block', marginTop: 8 }
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={s.page} onSubmit={handleSubmit}>
      <div style={s.heading}>Create account</div>
      <div style={s.sub}>You'll invite your partner after signing up</div>
      <div>
        <label style={s.label}>Name</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
      </div>
      <div>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div>
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      </div>
      {error && <div style={s.error}>{error}</div>}
      <button style={s.btn} disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
      <Link to="/login" style={s.link}>Already have an account? Sign in</Link>
    </form>
  )
}
```

`client/src/pages/AcceptInvite.jsx`:
```jsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const s = {
  page: { padding: 32, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '40px auto 0' },
  heading: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 },
  sub: { fontSize: 13, color: '#666', marginBottom: 8 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: 4, display: 'block' },
  input: { width: '100%', background: '#1a1a2e', border: '1px solid #252540', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none' },
  btn: { width: '100%', padding: 14, background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { color: '#f77c6a', fontSize: 13 }
}

export default function AcceptInvite() {
  const { acceptInvite } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inviteToken = params.get('token')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!inviteToken) return <div style={{ padding: 32, color: '#f77c6a' }}>Invalid invite link.</div>

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await acceptInvite(name, email, password, inviteToken)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to accept invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={s.page} onSubmit={handleSubmit}>
      <div style={s.heading}>Join your partner</div>
      <div style={s.sub}>Create your account to connect</div>
      <div>
        <label style={s.label}>Name</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div>
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      </div>
      {error && <div style={s.error}>{error}</div>}
      <button style={s.btn} disabled={loading}>{loading ? 'Joining...' : 'Join & Connect'}</button>
    </form>
  )
}
```

- [ ] **Step 7: Add workout + wellness logger routes to App.jsx**

Replace the entire contents of `client/src/App.jsx` with:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import Partner from './pages/Partner'
import Settings from './pages/Settings'
import WorkoutLogger from './screens/WorkoutLogger'
import SharedWorkoutLogger from './screens/SharedWorkoutLogger'
import WellnessLogger from './screens/WellnessLogger'
import BottomNav from './components/BottomNav'

const styles = {
  app: { display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto' },
  main: { flex: 1, overflowY: 'auto', paddingBottom: 80 }
}

function ProtectedLayout() {
  return (
    <div style={styles.app}>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/log/workout" element={<WorkoutLogger />} />
          <Route path="/log/workout/shared" element={<SharedWorkoutLogger />} />
          <Route path="/log/wellness" element={<WellnessLogger />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { currentUser, loading } = useAuth()
  if (loading) return <div style={{ padding: 24, color: '#666' }}>Loading...</div>
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }
  return <ProtectedLayout />
}
```

- [ ] **Step 8: Verify app loads and routing works**

```bash
cd client && npm run dev
```

Navigate to `http://localhost:5173` — should show Login page. Register a user, should redirect to Dashboard stub.

- [ ] **Step 9: Commit**

```bash
git add client/src/
git commit -m "feat: app shell, auth pages, bottom nav, FAB, log sheet"
```

---

## Task 4: Workout Logger — Solo

**Files:**
- Create: `client/src/screens/WorkoutLogger.jsx`
- Create stub: `client/src/screens/SharedWorkoutLogger.jsx`
- Create stub: `client/src/screens/WellnessLogger.jsx`

- [ ] **Step 1: Create `client/src/screens/WorkoutLogger.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'

const s = {
  page: { padding: '16px 16px 100px', maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' },
  backBtn: { background: 'none', border: 'none', color: '#7c6af7', fontSize: 14, cursor: 'pointer', padding: '4px 0' },
  exerciseCard: { background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 12 },
  exerciseName: { fontSize: 14, fontWeight: 600, marginBottom: 10 },
  colHeaders: { display: 'grid', gridTemplateColumns: '32px 1fr 1fr 40px', gap: 6, marginBottom: 6 },
  colLabel: { fontSize: 10, textTransform: 'uppercase', color: '#555', textAlign: 'center' },
  setRow: { display: 'grid', gridTemplateColumns: '32px 1fr 1fr 40px', gap: 6, marginBottom: 6, alignItems: 'center' },
  setNum: { fontSize: 11, color: '#555', textAlign: 'center' },
  input: { background: '#252540', border: '1px solid #333', borderRadius: 6, padding: '8px 4px', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', width: '100%', outline: 'none' },
  confirmBtn: (done) => ({ background: done ? '#4caf8a' : '#252540', border: `1px solid ${done ? '#4caf8a' : '#333'}`, borderRadius: 6, color: done ? '#fff' : '#555', fontSize: 16, cursor: 'pointer', padding: '6px 0', textAlign: 'center' }),
  addSetBtn: { background: 'none', border: '1px dashed #333', borderRadius: 6, padding: 8, color: '#7c6af7', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 4 },
  addExBtn: { background: '#1a1a2e', border: '1px solid #252540', borderRadius: 10, padding: 12, color: '#7c6af7', fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 12, fontWeight: 600 },
  finishBtn: { background: '#7c6af7', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
  pill: { background: '#f7a76c22', border: '1px solid #f7a76c55', borderRadius: 20, padding: '4px 12px', color: '#f7a76c', fontSize: 11, display: 'inline-block', marginBottom: 12 },
  exercisePicker: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: 8, color: '#fff', fontSize: 14, width: '100%', marginBottom: 12, outline: 'none' }
}

function makeSet(prev = null) {
  return { weight: prev?.weight || '', reps: prev?.reps || '', confirmed: false }
}

export default function WorkoutLogger() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { forPartner } = state || {}

  const [exercises, setExercises] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [workoutId, setWorkoutId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  // Each entry: { exerciseId, exerciseName, sets: [{ weight, reps, confirmed }] }
  const [loggedExercises, setLoggedExercises] = useState([])

  useEffect(() => {
    api.get('/exercises').then(setAllExercises)
    // Create workout immediately so we have an ID
    api.post('/workouts', { date: new Date().toISOString().split('T')[0], is_shared: false })
      .then(w => setWorkoutId(w.id))
  }, [])

  function addExercise(exerciseId) {
    const ex = allExercises.find(e => e.id === Number(exerciseId))
    if (!ex) return
    setLoggedExercises(prev => [...prev, {
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: [makeSet()]
    }])
    setShowPicker(false)
  }

  function updateSet(exIdx, setIdx, field, value) {
    setLoggedExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value, confirmed: false } : s)
      return { ...ex, sets }
    }))
  }

  function confirmSet(exIdx, setIdx) {
    setLoggedExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, j) => {
        if (j !== setIdx) return s
        return { ...s, confirmed: true }
      })
      // Auto-add next set pre-filled if this was the last
      const isLast = setIdx === ex.sets.length - 1
      const newSets = isLast ? [...sets, makeSet(sets[setIdx])] : sets
      return { ...ex, sets: newSets }
    }))
  }

  async function finish() {
    if (!workoutId) return
    setSaving(true)
    try {
      for (const ex of loggedExercises) {
        const confirmedSets = ex.sets.filter(s => s.confirmed)
        for (let i = 0; i < confirmedSets.length; i++) {
          const s = confirmedSets[i]
          await api.post(`/workouts/${workoutId}/sets`, {
            exercise_id: ex.exerciseId,
            set_number: i + 1,
            weight_lbs: s.weight ? Number(s.weight) : null,
            reps: s.reps ? Number(s.reps) : null
          })
        }
      }
      navigate('/')
    } catch (err) {
      alert('Error saving workout: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>Cancel</button>
        <div style={s.title}>Log Workout</div>
        <div style={{ width: 60 }} />
      </div>

      {forPartner && <div style={s.pill}>Logging for partner</div>}

      {loggedExercises.map((ex, exIdx) => (
        <div key={exIdx} style={s.exerciseCard}>
          <div style={s.exerciseName}>{ex.exerciseName}</div>
          <div style={s.colHeaders}>
            <div style={s.colLabel}>Set</div>
            <div style={s.colLabel}>lbs</div>
            <div style={s.colLabel}>reps</div>
            <div />
          </div>
          {ex.sets.map((set, setIdx) => (
            <div key={setIdx} style={s.setRow}>
              <div style={s.setNum}>{setIdx + 1}</div>
              <input
                style={{ ...s.input, borderColor: set.confirmed ? '#4caf8a44' : '#333' }}
                value={set.weight}
                onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                placeholder="lbs"
                type="number"
                inputMode="decimal"
              />
              <input
                style={{ ...s.input, borderColor: set.confirmed ? '#4caf8a44' : '#333' }}
                value={set.reps}
                onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                placeholder="reps"
                type="number"
                inputMode="numeric"
              />
              <button style={s.confirmBtn(set.confirmed)} onClick={() => confirmSet(exIdx, setIdx)}>✓</button>
            </div>
          ))}
        </div>
      ))}

      {showPicker ? (
        <select style={s.exercisePicker} onChange={e => addExercise(e.target.value)} defaultValue="">
          <option value="" disabled>Select exercise...</option>
          {allExercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      ) : (
        <button style={s.addExBtn} onClick={() => setShowPicker(true)}>+ Add Exercise</button>
      )}

      <button style={s.finishBtn} onClick={finish} disabled={saving}>
        {saving ? 'Saving...' : 'Finish Workout'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create stub `client/src/screens/SharedWorkoutLogger.jsx`**

```jsx
export default function SharedWorkoutLogger() {
  return <div style={{ padding: 20, color: '#fff' }}>Shared Logger — coming in Task 5</div>
}
```

- [ ] **Step 3: Create stub `client/src/screens/WellnessLogger.jsx`**

```jsx
export default function WellnessLogger() {
  return <div style={{ padding: 20, color: '#fff' }}>Wellness Logger — coming in Task 6</div>
}
```

- [ ] **Step 4: Test manually in browser**

With the backend running on port 3001 and the client on 5173:
1. Register as Joe
2. Tap + → Workout → Start
3. Add Bench Press, enter 185/5, tap ✓
4. Tap + next set — should auto-fill 185/5
5. Tap Finish Workout
6. Verify no console errors

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/
git commit -m "feat: solo workout logger with auto-populate sets"
```

---

## Task 5: Shared Workout Logger (Side-by-Side)

**Files:**
- Modify: `client/src/screens/SharedWorkoutLogger.jsx`
- Modify: `client/src/components/LogSheet.jsx` (route to shared logger when both selected)

- [ ] **Step 1: Update `client/src/components/LogSheet.jsx` navigate call**

In `handleStart()`, change the workout navigate to:

```js
function handleStart() {
  onClose()
  if (type === 'workout') {
    const path = (forJoe && forPartner) ? '/log/workout/shared' : '/log/workout'
    navigate(path, { state: { forJoe, forPartner } })
  } else {
    navigate('/log/wellness', { state: { forJoe } })
  }
}
```

- [ ] **Step 2: Implement `client/src/screens/SharedWorkoutLogger.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const COL = { joe: '#7c6af7', partner: '#f7a76c' }

const s = {
  page: { padding: '16px 16px 100px', maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: 700 },
  backBtn: { background: 'none', border: 'none', color: '#7c6af7', fontSize: 14, cursor: 'pointer' },
  sharedBadge: { background: '#7c6af722', border: '1px solid #7c6af755', borderRadius: 20, padding: '4px 12px', color: '#a090ff', fontSize: 11, marginBottom: 14, display: 'inline-block' },
  exerciseCard: { background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 12 },
  exerciseName: { fontSize: 14, fontWeight: 600, marginBottom: 10 },
  colHeaders: { display: 'grid', gridTemplateColumns: '28px 1fr 1fr 38px', gap: 5, marginBottom: 6, alignItems: 'center' },
  personHeader: (color) => ({ background: `${color}22`, border: `1px solid ${color}`, borderRadius: 6, padding: '3px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color }),
  setRow: { display: 'grid', gridTemplateColumns: '28px 1fr 1fr 38px', gap: 5, marginBottom: 5, alignItems: 'center' },
  setNum: { fontSize: 11, color: '#555', textAlign: 'center' },
  input: (color, confirmed) => ({
    background: confirmed ? `${color}11` : '#252540',
    border: `1px solid ${confirmed ? color + '44' : '#333'}`,
    borderRadius: 6, padding: '7px 4px', color: confirmed ? color : '#fff',
    fontSize: 12, fontWeight: 600, textAlign: 'center', width: '100%', outline: 'none'
  }),
  confirmBtn: (done) => ({
    background: done ? '#4caf8a' : '#252540', border: `1px solid ${done ? '#4caf8a' : '#333'}`,
    borderRadius: 6, color: done ? '#fff' : '#555', fontSize: 15, cursor: 'pointer', padding: '5px 0'
  }),
  addSetBtn: { background: 'none', border: '1px dashed #333', borderRadius: 6, padding: 7, color: '#7c6af7', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 4 },
  addExBtn: { background: '#1a1a2e', border: '1px solid #252540', borderRadius: 10, padding: 12, color: '#7c6af7', fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 12, fontWeight: 600 },
  finishBtn: { background: '#7c6af7', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
  picker: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: 8, color: '#fff', fontSize: 14, width: '100%', marginBottom: 12, outline: 'none' }
}

function makeSet(prev = null) {
  return {
    joe: { weight: prev?.joe.weight || '', reps: prev?.joe.reps || '' },
    partner: { weight: prev?.partner.weight || '', reps: prev?.partner.reps || '' },
    confirmed: false
  }
}

export default function SharedWorkoutLogger() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const partnerName = currentUser.partner_name || 'Partner'

  const [allExercises, setAllExercises] = useState([])
  const [joeWorkoutId, setJoeWorkoutId] = useState(null)
  const [partnerWorkoutId, setPartnerWorkoutId] = useState(null)
  const [loggedExercises, setLoggedExercises] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/exercises').then(setAllExercises)
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      api.post('/workouts', { date: today, is_shared: true }),
      api.post('/partner/workouts', { date: today, is_shared: true }).catch(() => null)
    ]).then(([jw, pw]) => {
      setJoeWorkoutId(jw.id)
      if (pw) setPartnerWorkoutId(pw.id)
    })
  }, [])

  function addExercise(exerciseId) {
    const ex = allExercises.find(e => e.id === Number(exerciseId))
    if (!ex) return
    setLoggedExercises(prev => [...prev, { exerciseId: ex.id, exerciseName: ex.name, sets: [makeSet()] }])
    setShowPicker(false)
  }

  function updateSet(exIdx, setIdx, person, field, value) {
    setLoggedExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, j) => j === setIdx ? { ...s, [person]: { ...s[person], [field]: value }, confirmed: false } : s)
      return { ...ex, sets }
    }))
  }

  function confirmSet(exIdx, setIdx) {
    setLoggedExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((s, j) => j === setIdx ? { ...s, confirmed: true } : s)
      const isLast = setIdx === ex.sets.length - 1
      const newSets = isLast ? [...sets, makeSet(sets[setIdx])] : sets
      return { ...ex, sets: newSets }
    }))
  }

  async function finish() {
    setSaving(true)
    try {
      for (const ex of loggedExercises) {
        const confirmedSets = ex.sets.filter(s => s.confirmed)
        for (let i = 0; i < confirmedSets.length; i++) {
          const set = confirmedSets[i]
          if (joeWorkoutId) {
            await api.post(`/workouts/${joeWorkoutId}/sets`, {
              exercise_id: ex.exerciseId, set_number: i + 1,
              weight_lbs: set.joe.weight ? Number(set.joe.weight) : null,
              reps: set.joe.reps ? Number(set.joe.reps) : null
            })
          }
          if (partnerWorkoutId) {
            await api.post(`/workouts/${partnerWorkoutId}/sets`, {
              exercise_id: ex.exerciseId, set_number: i + 1,
              weight_lbs: set.partner.weight ? Number(set.partner.weight) : null,
              reps: set.partner.reps ? Number(set.partner.reps) : null
            })
          }
        }
      }
      navigate('/')
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const joeInitial = currentUser.name?.charAt(0) || 'J'
  const partnerInitial = partnerName.charAt(0)

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>Cancel</button>
        <div style={s.title}>Shared Workout</div>
        <div style={{ width: 60 }} />
      </div>
      <div style={s.sharedBadge}>Logging for both — different stats per person</div>

      {loggedExercises.map((ex, exIdx) => (
        <div key={exIdx} style={s.exerciseCard}>
          <div style={s.exerciseName}>{ex.exerciseName}</div>
          <div style={s.colHeaders}>
            <div style={s.setNum}>#</div>
            <div style={s.personHeader(COL.joe)}>{joeInitial} {currentUser.name?.split(' ')[0]}</div>
            <div style={s.personHeader(COL.partner)}>{partnerInitial} {partnerName.split(' ')[0]}</div>
            <div />
          </div>
          {ex.sets.map((set, setIdx) => (
            <div key={setIdx} style={s.setRow}>
              <div style={s.setNum}>{setIdx + 1}</div>
              {/* Joe's cell: weight×reps in one tappable field */}
              <div style={{ display: 'flex', gap: 3 }}>
                <input
                  style={s.input(COL.joe, set.confirmed)}
                  value={set.joe.weight}
                  onChange={e => updateSet(exIdx, setIdx, 'joe', 'weight', e.target.value)}
                  placeholder="lbs"
                  type="number"
                  inputMode="decimal"
                />
                <input
                  style={s.input(COL.joe, set.confirmed)}
                  value={set.joe.reps}
                  onChange={e => updateSet(exIdx, setIdx, 'joe', 'reps', e.target.value)}
                  placeholder="reps"
                  type="number"
                  inputMode="numeric"
                />
              </div>
              {/* Partner's cell */}
              <div style={{ display: 'flex', gap: 3 }}>
                <input
                  style={s.input(COL.partner, set.confirmed)}
                  value={set.partner.weight}
                  onChange={e => updateSet(exIdx, setIdx, 'partner', 'weight', e.target.value)}
                  placeholder="lbs"
                  type="number"
                  inputMode="decimal"
                />
                <input
                  style={s.input(COL.partner, set.confirmed)}
                  value={set.partner.reps}
                  onChange={e => updateSet(exIdx, setIdx, 'partner', 'reps', e.target.value)}
                  placeholder="reps"
                  type="number"
                  inputMode="numeric"
                />
              </div>
              <button style={s.confirmBtn(set.confirmed)} onClick={() => confirmSet(exIdx, setIdx)}>✓</button>
            </div>
          ))}
        </div>
      ))}

      {showPicker ? (
        <select style={s.picker} onChange={e => addExercise(e.target.value)} defaultValue="">
          <option value="" disabled>Select exercise...</option>
          {allExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      ) : (
        <button style={s.addExBtn} onClick={() => setShowPicker(true)}>+ Add Exercise</button>
      )}

      <button style={s.finishBtn} onClick={finish} disabled={saving}>
        {saving ? 'Saving...' : 'Finish Shared Workout'}
      </button>
    </div>
  )
}
```

> **Note on partner workout creation:** The backend `/api/partner/workouts` POST route needs to be added to `server/routes/partner.js` to allow Joe to create a workout on Sydney's behalf during a shared session. Add this route:
>
> ```js
> router.post('/workouts', async (req, res) => {
>   const partnerId = await getPartnerId(req.user.id)
>   if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
>   const { date, is_shared } = req.body
>   const result = await pool.query(
>     'INSERT INTO workouts (user_id, date, is_shared) VALUES ($1, $2, $3) RETURNING *',
>     [partnerId, date || new Date().toISOString().split('T')[0], is_shared || false]
>   )
>   res.status(201).json({ ...result.rows[0], sets: [] })
> })
> ```
> Also add a `POST /api/partner/workouts/:id/sets` route in the same pattern.

- [ ] **Step 3: Manually test shared workout flow**

1. Log in as Joe, tap + → Workout → select both Joe + Sydney → Start Shared Workout
2. Add Bench Press
3. Enter 185/5 for Joe, 95/8 for Sydney, tap ✓
4. Verify set 2 auto-fills both values
5. Tap Finish
6. Log in as Sydney, verify workout appears in her history

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/SharedWorkoutLogger.jsx client/src/components/LogSheet.jsx server/routes/partner.js
git commit -m "feat: shared workout logger with side-by-side auto-populate"
```

---

## Task 6: Wellness Logger

**Files:**
- Modify: `client/src/screens/WellnessLogger.jsx`

- [ ] **Step 1: Implement `client/src/screens/WellnessLogger.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const PAIN_AREAS = ['Knee', 'Back', 'Shoulder', 'Hip', 'Neck', 'General Fatigue', 'Wrist', 'Ankle']

const s = {
  page: { padding: '16px 16px 100px', maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 700 },
  backBtn: { background: 'none', border: 'none', color: '#7c6af7', fontSize: 14, cursor: 'pointer' },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 14 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10, display: 'block' },
  slider: { width: '100%', accentColor: '#7c6af7', height: 4, marginBottom: 4 },
  sliderValue: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: (active) => ({
    padding: '6px 12px', borderRadius: 20, fontSize: 12,
    background: active ? '#7c6af7' : '#252540',
    color: active ? '#fff' : '#888',
    border: `1px solid ${active ? '#7c6af7' : '#333'}`,
    cursor: 'pointer'
  }),
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  numInput: { background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 16, fontWeight: 600, width: '100%', outline: 'none' },
  toggle: (on) => ({
    width: '100%', padding: 12, borderRadius: 8,
    background: on ? '#4caf8a22' : '#252540',
    border: `1px solid ${on ? '#4caf8a' : '#333'}`,
    color: on ? '#4caf8a' : '#888',
    fontSize: 14, fontWeight: 600, cursor: 'pointer'
  }),
  textarea: { background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, width: '100%', outline: 'none', resize: 'none', minHeight: 80 },
  saveBtn: { background: '#7c6af7', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 }
}

export default function WellnessLogger() {
  const navigate = useNavigate()
  const [pain, setPain] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [mood, setMood] = useState(5)
  const [sleep, setSleep] = useState('')
  const [water, setWater] = useState('')
  const [creatine, setCreatine] = useState(false)
  const [painAreas, setPainAreas] = useState([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleArea(area) {
    const lower = area.toLowerCase()
    setPainAreas(prev => prev.includes(lower) ? prev.filter(a => a !== lower) : [...prev, lower])
  }

  async function save() {
    setSaving(true)
    try {
      await api.post('/wellness', {
        date: new Date().toISOString().split('T')[0],
        pain_level: pain,
        energy_level: energy,
        mood,
        sleep_hours: sleep ? Number(sleep) : null,
        water_oz: water ? Number(water) : null,
        creatine_taken: creatine,
        pain_areas: painAreas,
        notes: notes || null
      })
      navigate('/')
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>Cancel</button>
        <div style={s.title}>Wellness Check-In</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={s.card}>
        <label style={s.label}>Pain Level</label>
        <div style={s.sliderValue}>{pain} <span style={{ fontSize: 13, color: '#555', fontWeight: 400 }}>/ 10</span></div>
        <input type="range" min="1" max="10" value={pain} onChange={e => setPain(Number(e.target.value))} style={s.slider} />
        <div style={{ ...s.tagsRow, marginTop: 12 }}>
          {PAIN_AREAS.map(area => (
            <button key={area} style={s.tag(painAreas.includes(area.toLowerCase()))} onClick={() => toggleArea(area)}>{area}</button>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <label style={s.label}>Energy Level</label>
        <div style={s.sliderValue}>{energy} <span style={{ fontSize: 13, color: '#555', fontWeight: 400 }}>/ 10</span></div>
        <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(Number(e.target.value))} style={s.slider} />
      </div>

      <div style={s.card}>
        <label style={s.label}>Mood</label>
        <div style={s.sliderValue}>{mood} <span style={{ fontSize: 13, color: '#555', fontWeight: 400 }}>/ 10</span></div>
        <input type="range" min="1" max="10" value={mood} onChange={e => setMood(Number(e.target.value))} style={s.slider} />
      </div>

      <div style={s.card}>
        <div style={s.row}>
          <div>
            <label style={s.label}>Sleep (hrs)</label>
            <input style={s.numInput} type="number" inputMode="decimal" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="7.5" />
          </div>
          <div>
            <label style={s.label}>Water (oz)</label>
            <input style={s.numInput} type="number" inputMode="numeric" value={water} onChange={e => setWater(e.target.value)} placeholder="80" />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <label style={s.label}>Creatine Taken</label>
        <button style={s.toggle(creatine)} onClick={() => setCreatine(v => !v)}>
          {creatine ? 'Yes — taken today' : 'No'}
        </button>
      </div>

      <div style={s.card}>
        <label style={s.label}>Notes</label>
        <textarea style={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did you feel? Any symptoms, wins, struggles..." />
      </div>

      <button style={s.saveBtn} onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Check-In'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Manually test wellness logger**

Tap + → Wellness → Log Wellness. Adjust sliders, tag knee + back, tap Save. Should redirect to dashboard with no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/screens/WellnessLogger.jsx
git commit -m "feat: wellness check-in screen with pain areas, sliders, creatine toggle"
```

---

## Task 7: Dashboard

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`
- Create: `client/src/components/StatCard.jsx`
- Create: `client/src/components/SparkBar.jsx`
- Create: `client/src/components/DualLineChart.jsx`

- [ ] **Step 1: Create `client/src/components/StatCard.jsx`**

```jsx
const s = {
  card: { background: '#1a1a2e', borderRadius: 10, padding: 14 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff', fontWeight: 600 },
  link: { fontSize: 10, color: '#7c6af7', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }
}

export default function StatCard({ title, linkLabel, onLink, children }) {
  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}>{title}</span>
        {linkLabel && <button style={s.link} onClick={onLink}>{linkLabel}</button>}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `client/src/components/SparkBar.jsx`**

```jsx
export default function SparkBar({ data = [], color = '#7c6af7', height = 36 }) {
  if (!data.length) return <div style={{ height, background: '#252540', borderRadius: 4 }} />
  const max = Math.max(...data.map(d => Number(d.value || 0)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: max > 0 ? `${Math.max(8, (Number(d.value) / max) * 100)}%` : '8%',
            background: i === data.length - 1 ? color : `${color}55`,
            borderRadius: '2px 2px 0 0'
          }}
          title={d.label}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `client/src/components/DualLineChart.jsx`**

```jsx
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

export default function DualLineChart({ data = [] }) {
  if (!data.length) return <div style={{ height: 44, background: '#252540', borderRadius: 4 }} />
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="pain_level" stroke="#f7a76c" dot={false} strokeWidth={1.5} />
        <Line type="monotone" dataKey="energy_level" stroke="#7c6af7" dot={false} strokeWidth={1.5} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid #252540', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: '#666' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Implement `client/src/pages/Dashboard.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import SparkBar from '../components/SparkBar'
import DualLineChart from '../components/DualLineChart'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  dayLabel: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  dateLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  streakNum: { fontSize: 22, fontWeight: 700, textAlign: 'right' },
  streakSub: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555' },
  todayRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  todayCell: { background: '#1a1a2e', borderRadius: 8, padding: 10 },
  cellLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 3 },
  cellValue: (color) => ({ fontSize: 18, fontWeight: 700, color }),
  cellSub: { fontSize: 11, color: '#888' },
  prCallout: { fontSize: 12, fontWeight: 600, color: '#4caf8a', marginTop: 6 },
  legendRow: { display: 'flex', gap: 14, marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#666' },
  legendLine: (color) => ({ width: 12, height: 2, background: color, borderRadius: 1 }),
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 8 },
  calDot: (type) => ({
    aspectRatio: '1', borderRadius: 3,
    background: type === 'workout' ? '#4caf8a' : type === 'rest' ? '#f7a76c' : '#1f1f30',
    opacity: type === 'workout' ? 0.8 : type === 'rest' ? 0.6 : 1
  }),
  partnerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  partnerMeta: { fontSize: 10, color: '#555', marginTop: 3 }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [consistency, setConsistency] = useState(null)
  const [healthData, setHealthData] = useState([])
  const [todayWellness, setTodayWellness] = useState(null)
  const [prs, setPrs] = useState([])
  const [strengthHistory, setStrengthHistory] = useState([])
  const [topExercise, setTopExercise] = useState(null)
  const [partnerData, setPartnerData] = useState(null)

  const now = new Date()
  const dayName = DAYS[now.getDay()]
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}`

  useEffect(() => {
    api.get('/stats/consistency').then(setConsistency)
    api.get('/stats/health?start=' + thirtyDaysAgo()).then(data => setHealthData(data.slice(-30)))
    api.get('/wellness/today').then(setTodayWellness)
    api.get('/stats/prs').then(prs => {
      setPrs(prs)
      // Load strength history for the exercise with the most sessions
      if (prs.length > 0) {
        const topPR = prs.reduce((a, b) => Number(b.max_weight_lbs) > Number(a.max_weight_lbs) ? b : a)
        setTopExercise(topPR)
        api.get(`/stats/strength/${topPR.exercise_id}`).then(h => setStrengthHistory(h.slice(-7)))
      }
    })
    api.get('/partner/profile').then(profile => {
      api.get('/partner/workouts').then(workouts => {
        api.get('/partner/wellness').then(wellness => {
          setPartnerData({ profile, recentWorkout: workouts[0] || null, recentWellness: wellness[0] || null })
        })
      })
    }).catch(() => {})
  }, [])

  function thirtyDaysAgo() {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }

  // Build calendar dots for current month
  const workoutDateSet = new Set(consistency?.workout_dates || [])
  const calDots = []
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const isToday = d === now.getDate()
    calDots.push(workoutDateSet.has(dateStr) ? 'workout' : isToday ? 'today' : d < now.getDate() ? 'rest' : 'future')
  }

  const sparkData = strengthHistory.map(h => ({ value: h.max_weight_lbs, label: h.date }))
  const topPR = topExercise ? Number(topExercise.max_weight_lbs) : null

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.dayLabel}>{dayName}</div>
          <div style={s.dateLabel}>{dateStr}</div>
        </div>
        <div>
          <div style={s.streakNum}>{consistency?.current_streak ?? '—'}</div>
          <div style={s.streakSub}>Day streak</div>
        </div>
      </div>

      {/* Today's status */}
      <div style={s.todayRow}>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Workout</div>
          {workoutDateSet.has(new Date().toISOString().split('T')[0])
            ? <div style={s.cellValue('#4caf8a')}>Done</div>
            : <div style={s.cellValue('#555')}>—</div>}
        </div>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Pain</div>
          <div style={s.cellValue('#f7a76c')}>
            {todayWellness?.pain_level ?? '—'}
            {todayWellness && <span style={{ fontSize: 10, color: '#555', fontWeight: 400 }}> /10</span>}
          </div>
        </div>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Energy</div>
          <div style={s.cellValue('#7c6af7')}>
            {todayWellness?.energy_level ?? '—'}
            {todayWellness && <span style={{ fontSize: 10, color: '#555', fontWeight: 400 }}> /10</span>}
          </div>
        </div>
      </div>

      {/* Strength card */}
      <StatCard title="Strength" linkLabel="All lifts" onLink={() => navigate('/stats')}>
        <SparkBar data={sparkData} />
        {topExercise && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 10, color: '#666' }}>{topExercise.exercise_name}</div>
            {topPR && <div style={s.prCallout}>{topPR} lbs — PR</div>}
          </div>
        )}
      </StatCard>

      {/* Health trends */}
      <StatCard title="Health Trends" linkLabel="Details" onLink={() => navigate('/stats')}>
        <DualLineChart data={healthData} />
        <div style={s.legendRow}>
          <div style={s.legendItem}><div style={s.legendLine('#f7a76c')} />Pain</div>
          <div style={s.legendItem}><div style={s.legendLine('#7c6af7')} />Energy</div>
        </div>
      </StatCard>

      {/* Consistency */}
      <StatCard title={MONTHS[now.getMonth()]} linkLabel="Calendar" onLink={() => navigate('/stats')}>
        <div style={s.calGrid}>
          {calDots.map((type, i) => <div key={i} style={s.calDot(type)} />)}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['#4caf8a', 'Workout'], ['#f7a76c', 'Rest']].map(([color, label]) => (
            <div key={label} style={s.legendItem}>
              <div style={{ width: 8, height: 8, background: color, borderRadius: 2, opacity: 0.8 }} />
              {label}
            </div>
          ))}
        </div>
      </StatCard>

      {/* Partner card */}
      {partnerData && (
        <StatCard title={partnerData.profile.name} linkLabel="View" onLink={() => navigate('/partner')}>
          {partnerData.recentWorkout
            ? <div style={s.partnerSub}>{partnerData.recentWorkout.notes || 'Workout logged'}</div>
            : <div style={s.partnerSub}>No recent activity</div>}
          {partnerData.recentWellness && (
            <div style={s.partnerMeta}>
              Pain {partnerData.recentWellness.pain_level} · Energy {partnerData.recentWellness.energy_level}
            </div>
          )}
        </StatCard>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify dashboard loads**

Start both server and client. Log in as Joe (with some workout/wellness data). Dashboard should show streak, today's status, strength sparkline, health trends chart, consistency calendar, and Sydney's card.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Dashboard.jsx client/src/components/
git commit -m "feat: dashboard with streak, health trends, consistency calendar, partner card"
```

---

## Task 8: Stats Page

**Files:**
- Modify: `client/src/pages/Stats.jsx`

- [ ] **Step 1: Implement `client/src/pages/Stats.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto' },
  tabs: { display: 'flex', background: '#1a1a2e', borderRadius: 10, padding: 3, marginBottom: 20 },
  tab: (active) => ({
    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: active ? '#7c6af7' : 'transparent',
    color: active ? '#fff' : '#666'
  }),
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 12 },
  select: { background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: '100%', marginBottom: 14, outline: 'none' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 14 },
  filterBtn: (active) => ({
    padding: '6px 12px', borderRadius: 20, border: `1px solid ${active ? '#7c6af7' : '#333'}`,
    background: active ? '#7c6af722' : 'transparent', color: active ? '#a090ff' : '#666',
    fontSize: 11, cursor: 'pointer'
  }),
  statRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 700 },
  statSub: { fontSize: 10, textTransform: 'uppercase', color: '#555', letterSpacing: '0.5px', marginTop: 2 },
  prRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #252540', marginBottom: 8 },
  prName: { fontSize: 13, color: '#fff' },
  prWeight: { fontSize: 13, fontWeight: 700, color: '#4caf8a' },
  legendRow: { display: 'flex', gap: 14, marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#666' },
  legendLine: (color) => ({ width: 12, height: 2, background: color, borderRadius: 1 })
}

const FILTERS = ['7d', '30d', '90d', 'All']

function tooltipStyle() {
  return {
    contentStyle: { background: '#1a1a2e', border: '1px solid #252540', borderRadius: 6, fontSize: 11 },
    itemStyle: { color: '#fff' },
    labelStyle: { color: '#666' }
  }
}

export default function Stats() {
  const [activeTab, setActiveTab] = useState('strength')
  const [exercises, setExercises] = useState([])
  const [selectedExId, setSelectedExId] = useState('')
  const [strengthData, setStrengthData] = useState([])
  const [prs, setPrs] = useState([])
  const [healthFilter, setHealthFilter] = useState('30d')
  const [healthData, setHealthData] = useState([])
  const [consistency, setConsistency] = useState(null)
  const [weeklyVolume, setWeeklyVolume] = useState([])

  useEffect(() => {
    api.get('/exercises').then(exs => {
      setExercises(exs)
      if (exs.length) setSelectedExId(String(exs[0].id))
    })
    api.get('/stats/prs').then(setPrs)
    api.get('/stats/consistency').then(setConsistency)
  }, [])

  useEffect(() => {
    if (!selectedExId) return
    api.get(`/stats/strength/${selectedExId}`).then(setStrengthData)
  }, [selectedExId])

  useEffect(() => {
    const days = healthFilter === '7d' ? 7 : healthFilter === '30d' ? 30 : healthFilter === '90d' ? 90 : 365
    const start = new Date(); start.setDate(start.getDate() - days)
    api.get(`/stats/health?start=${start.toISOString().split('T')[0]}`).then(setHealthData)
  }, [healthFilter])

  return (
    <div style={s.page}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 }}>Stats</div>

      <div style={s.tabs}>
        {['strength', 'health', 'consistency'].map(tab => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'strength' && (
        <>
          <select style={s.select} value={selectedExId} onChange={e => setSelectedExId(e.target.value)}>
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>

          <div style={s.card}>
            <div style={s.sectionLabel}>Max Weight Over Time</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={strengthData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: '#555' }} />
                <CartesianGrid stroke="#252540" />
                <Tooltip {...tooltipStyle()} formatter={v => [`${v} lbs`, 'Max Weight']} />
                <Line type="monotone" dataKey="max_weight_lbs" stroke="#7c6af7" dot={{ r: 3, fill: '#7c6af7' }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.sectionLabel}>Personal Records</div>
            {prs.length === 0 && <div style={{ color: '#555', fontSize: 13 }}>No lifts logged yet</div>}
            {prs.map(pr => (
              <div key={pr.exercise_id} style={s.prRow}>
                <div style={s.prName}>{pr.exercise_name}</div>
                <div style={s.prWeight}>{Number(pr.max_weight_lbs)} lbs</div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'health' && (
        <>
          <div style={s.filterRow}>
            {FILTERS.map(f => (
              <button key={f} style={s.filterBtn(healthFilter === f)} onClick={() => setHealthFilter(f)}>{f}</button>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.sectionLabel}>Pain & Energy</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={healthData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickFormatter={d => d?.slice(5)} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#555' }} />
                <CartesianGrid stroke="#252540" />
                <Tooltip {...tooltipStyle()} />
                <Line type="monotone" dataKey="pain_level" stroke="#f7a76c" dot={false} strokeWidth={1.5} name="Pain" />
                <Line type="monotone" dataKey="energy_level" stroke="#7c6af7" dot={false} strokeWidth={1.5} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
            <div style={s.legendRow}>
              <div style={s.legendItem}><div style={s.legendLine('#f7a76c')} />Pain</div>
              <div style={s.legendItem}><div style={s.legendLine('#7c6af7')} />Energy</div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'consistency' && consistency && (
        <>
          <div style={s.card}>
            <div style={s.statRow}>
              <div style={s.statItem}>
                <div style={s.statNum}>{consistency.current_streak}</div>
                <div style={s.statSub}>Current streak</div>
              </div>
              <div style={s.statItem}>
                <div style={s.statNum}>{consistency.longest_streak}</div>
                <div style={s.statSub}>Longest streak</div>
              </div>
              <div style={s.statItem}>
                <div style={s.statNum}>{consistency.total_workouts}</div>
                <div style={s.statSub}>Total workouts</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify stats page**

Navigate to Stats tab. Switch between Strength / Health / Consistency views. Strength should show a line chart, Health shows pain + energy lines with date filter, Consistency shows three numbers.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Stats.jsx
git commit -m "feat: stats page with strength progress, health trends, consistency"
```

---

## Task 9: Partner View + Settings + Export

**Files:**
- Modify: `client/src/pages/Partner.jsx`
- Modify: `client/src/pages/Settings.jsx`

- [ ] **Step 1: Implement `client/src/pages/Partner.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 },
  sub: { fontSize: 13, color: '#666', marginBottom: 20 },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 10 },
  workoutHeader: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  meta: { fontSize: 11, color: '#666' },
  exerciseName: { fontSize: 12, color: '#888', marginTop: 6 },
  setLine: { fontSize: 11, color: '#555', marginLeft: 8 },
  wellnessRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 },
  wellnessCell: { background: '#1a1a2e', borderRadius: 8, padding: 10, textAlign: 'center' },
  cellLabel: { fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 },
  noPartner: { color: '#555', fontSize: 14, textAlign: 'center', padding: 40 }
}

export default function Partner() {
  const [profile, setProfile] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [wellness, setWellness] = useState([])
  const [noPartner, setNoPartner] = useState(false)

  useEffect(() => {
    api.get('/partner/profile')
      .then(p => {
        setProfile(p)
        return Promise.all([api.get('/partner/workouts'), api.get('/partner/wellness')])
      })
      .then(([w, we]) => { setWorkouts(w.slice(0, 10)); setWellness(we.slice(0, 7)) })
      .catch(() => setNoPartner(true))
  }, [])

  if (noPartner) return (
    <div style={s.page}>
      <div style={s.title}>Partner</div>
      <div style={s.noPartner}>No partner linked yet. Share your invite link from Settings.</div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.title}>{profile?.name || '...'}</div>
      <div style={s.sub}>Recent activity</div>

      {wellness.length > 0 && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', marginBottom: 8 }}>Latest wellness</div>
          <div style={s.wellnessRow}>
            <div style={s.wellnessCell}>
              <div style={s.cellLabel}>Pain</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f7a76c' }}>{wellness[0].pain_level}</div>
            </div>
            <div style={s.wellnessCell}>
              <div style={s.cellLabel}>Energy</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#7c6af7' }}>{wellness[0].energy_level}</div>
            </div>
            <div style={s.wellnessCell}>
              <div style={s.cellLabel}>Mood</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{wellness[0].mood}</div>
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', marginBottom: 8, marginTop: 4 }}>Recent workouts</div>
      {workouts.length === 0 && <div style={s.meta}>No workouts yet</div>}
      {workouts.map(w => (
        <div key={w.id} style={s.card}>
          <div style={s.workoutHeader}>{new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          {w.notes && <div style={s.meta}>{w.notes}</div>}
          {w.sets && [...new Set(w.sets.map(s => s.exercise_id))].map(exId => {
            const exSets = w.sets.filter(s => s.exercise_id === exId)
            return (
              <div key={exId}>
                <div style={s.exerciseName}>{exSets[0].exercise_name}</div>
                {exSets.map((set, i) => (
                  <div key={i} style={s.setLine}>Set {set.set_number}: {set.weight_lbs} lbs × {set.reps}</div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Implement `client/src/pages/Settings.jsx`**

```jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10 },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: 600 },
  email: { fontSize: 13, color: '#666', marginTop: 2 },
  btn: (color = '#7c6af7') => ({ width: '100%', padding: 13, background: color, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }),
  inviteUrl: { background: '#252540', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#a090ff', wordBreak: 'break-all', marginTop: 8 },
  row: { display: 'flex', gap: 8, marginBottom: 8 },
  filterBtn: (active) => ({ padding: '6px 12px', borderRadius: 20, border: `1px solid ${active ? '#7c6af7' : '#333'}`, background: active ? '#7c6af722' : 'transparent', color: active ? '#a090ff' : '#666', fontSize: 11, cursor: 'pointer' })
}

export default function Settings() {
  const { currentUser, logout } = useAuth()
  const [inviteUrl, setInviteUrl] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)

  async function generateInvite() {
    const { inviteUrl } = await api.post('/auth/invite', {})
    setInviteUrl(inviteUrl)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const token = localStorage.getItem('rt_token')
      const res = await fetch(`/api/export?format=${exportFormat}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `robo-trainer-export.${exportFormat === 'csv' ? 'csv' : 'json'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Settings</div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Account</div>
        <div style={s.card}>
          <div style={s.name}>{currentUser.name}</div>
          <div style={s.email}>{currentUser.email}</div>
        </div>
        <button style={s.btn('#333')} onClick={logout}>Sign Out</button>
      </div>

      {!currentUser.partner_id && (
        <div style={s.section}>
          <div style={s.sectionLabel}>Invite Partner</div>
          <button style={s.btn()} onClick={generateInvite}>Generate Invite Link</button>
          {inviteUrl && (
            <>
              <div style={s.inviteUrl}>{inviteUrl}</div>
              <button style={{ ...s.btn('#252540'), marginTop: 8 }} onClick={() => navigator.clipboard.writeText(inviteUrl)}>
                Copy Link
              </button>
            </>
          )}
        </div>
      )}

      <div style={s.section}>
        <div style={s.sectionLabel}>Export Data</div>
        <div style={s.row}>
          {['csv', 'json'].map(f => (
            <button key={f} style={s.filterBtn(exportFormat === f)} onClick={() => setExportFormat(f)}>{f.toUpperCase()}</button>
          ))}
        </div>
        <button style={s.btn()} onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Download Export'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify partner view + settings**

1. Go to Settings — see name/email, sign out button
2. If no partner: see Invite section, tap Generate Invite Link, tap Copy Link
3. Go to Partner tab — see workout history and wellness for Sydney
4. Click Download Export — CSV file downloads

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Partner.jsx client/src/pages/Settings.jsx
git commit -m "feat: partner view, settings, invite flow, and data export"
```

---

## Task 10: Offline Queue + PWA

**Files:**
- Create: `client/src/offline/queue.js`
- Modify: `client/src/api/client.js`

- [ ] **Step 1: Create `client/src/offline/queue.js`**

```js
import { openDB } from 'idb'

const DB_NAME = 'robo-trainer-offline'
const STORE = 'request-queue'

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function enqueue(request) {
  const db = await getDb()
  await db.add(STORE, { ...request, timestamp: Date.now() })
}

export async function dequeueAll() {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function remove(id) {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function flushQueue(apiFn) {
  const items = await dequeueAll()
  for (const item of items) {
    try {
      await apiFn(item.path, item.body, item.method)
      await remove(item.id)
    } catch {
      // Leave in queue if still failing
    }
  }
}
```

- [ ] **Step 2: Update `client/src/api/client.js` to queue on network failure**

```js
import { enqueue, flushQueue } from '../offline/queue'

const BASE = '/api'

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
        'Content-Type': 'application/json',
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
    // Queue POST/PUT requests offline (not GETs — we can't return stale data here)
    if (options.method && options.method !== 'GET' && !navigator.onLine) {
      await enqueue({ path, body: options.body ? JSON.parse(options.body) : null, method: options.method })
      return { _queued: true }
    }
    throw err
  }
}

// Flush queued requests when back online
window.addEventListener('online', () => {
  flushQueue((path, body, method) =>
    request(path, { method, body: body ? JSON.stringify(body) : undefined })
  )
})

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
```

- [ ] **Step 3: Verify PWA install prompt**

```bash
cd client && npm run build && npm run preview
```

Open `http://localhost:4173` in Chrome. Open DevTools → Application → Manifest. Verify:
- Name: "Robo Trainer 3000"
- Icons present
- Display: standalone

In Chrome address bar, look for the install icon. Click it to install as PWA.

- [ ] **Step 4: Test offline logging**

1. Install app as PWA
2. Open DevTools → Network → set to "Offline"
3. Tap + → Workout → add sets → Finish
4. Should complete without error (request queued)
5. Set Network back to "Online"
6. App flushes queue automatically — verify workout appears

- [ ] **Step 5: Final commit**

```bash
git add client/src/offline/ client/src/api/client.js
git commit -m "feat: offline queue with IndexedDB auto-sync on reconnect"
```

---

## Phase 2 Complete ✓

Run both server and client:

```bash
npm run dev
```

**Verify the full flow:**
1. Joe registers, generates invite link
2. Sydney opens invite link, creates account — both are linked
3. Both can log workouts solo and shared (side-by-side columns, auto-populate sets)
4. Both can log wellness check-ins
5. Dashboard shows streak, health trends, consistency calendar, partner's latest
6. Stats shows strength progress, health trends (with date filter), consistency numbers
7. Partner tab shows the other person's workouts and wellness
8. Settings allows data export (CSV/JSON)
9. App installs as PWA and queues logs when offline

**Next:** See `docs/superpowers/plans/2026-04-22-phase-3-auth-partner-fix.md` if any backend partner route gaps are found, or begin executing Phase 1 then Phase 2 in order.
