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
        <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
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
