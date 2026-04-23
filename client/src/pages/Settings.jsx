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
    try {
      const { inviteUrl } = await api.post('/auth/invite', {})
      setInviteUrl(inviteUrl)
    } catch (err) {
      alert('Failed to generate invite: ' + err.message)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const token = localStorage.getItem('rt_token')
      const res = await fetch(`/api/export?format=${exportFormat}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Export failed')
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
