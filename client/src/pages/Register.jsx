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
