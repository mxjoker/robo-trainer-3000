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
    flex: 1, padding: '14px 0', borderRadius: 10, border: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
    background: active ? 'var(--accent-bg)' : '#252540', color: active ? 'var(--accent-dim)' : '#888',
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
  cta: { width: '100%', padding: 14, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  note: { fontSize: 11, color: '#555', textAlign: 'center', marginTop: 10 }
}

export default function LogSheet({ onClose }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [type, setType] = useState('workout')
  const [forJoe, setForJoe] = useState(true)
  const [forPartner, setForPartner] = useState(false)

  if (!currentUser) return null

  const partnerName = currentUser.partner_name || 'Partner'
  const bothSelected = type === 'workout' && forJoe && forPartner
  const ctaLabel = bothSelected ? 'Start Shared Workout' : type === 'workout' ? 'Start Workout' : 'Log Wellness'

  function handleStart() {
    onClose()
    if (type === 'workout') {
      if (bothSelected) {
        navigate('/log/workout/shared', { state: { forJoe, forPartner } })
      } else {
        navigate('/log/workout', { state: { forJoe, forPartner } })
      }
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
          <button style={s.personBtn(forJoe, 'var(--accent)')} onClick={() => type === 'workout' ? setForJoe(v => forPartner ? !v : true) : setForJoe(true)}>
            {forJoe && <span style={s.check}>✓</span>}
            {currentUser.name?.charAt(0) || 'J'}
            <div style={{ fontSize: 11, marginTop: 2 }}>{currentUser.name?.split(' ')[0] || 'You'}</div>
          </button>
          {currentUser.partner_id && (
            <button style={s.personBtn(forPartner, '#f472b6')} onClick={() => type === 'workout' && setForPartner(v => !v)} disabled={type === 'wellness'}>
              {forPartner && <span style={{ ...s.check, color: '#f472b6' }}>✓</span>}
              {partnerName.charAt(0)}
              <div style={{ fontSize: 11, marginTop: 2 }}>{partnerName.split(' ')[0]}</div>
            </button>
          )}
        </div>

        {bothSelected && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: 'var(--accent-dim)', textAlign: 'center' }}>
            Shared workout — log different stats per person
          </div>
        )}

        <button style={s.cta} onClick={handleStart}>{ctaLabel}</button>
        <div style={s.note}>Wellness is always logged individually</div>
      </div>
    </div>
  )
}
