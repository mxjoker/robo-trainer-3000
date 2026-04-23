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
