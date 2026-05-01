import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { requestAndSubscribe, isSupported, currentPermission } from '../services/pushService'

const s = {
  page: { padding: '20px 4px 100px' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10 },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: 600 },
  email: { fontSize: 13, color: '#666', marginTop: 2 },
  btn: (color = '#7c6af7') => ({ width: '100%', padding: 13, background: color, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }),
  inviteUrl: { background: '#252540', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#a090ff', wordBreak: 'break-all', marginTop: 8 },
  row: { display: 'flex', gap: 8, marginBottom: 8 },
  filterBtn: (active) => ({ padding: '6px 12px', borderRadius: 20, border: `1px solid ${active ? '#7c6af7' : '#333'}`, background: active ? '#7c6af722' : 'transparent', color: active ? '#a090ff' : '#666', fontSize: 11, cursor: 'pointer' }),
  toggle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  toggleLabel: { fontSize: 14, color: '#ccc' },
  toggleInput: { width: 44, height: 24, accentColor: '#7c6af7', cursor: 'pointer' },
  numInput: { background: '#252540', border: '1px solid #333', borderRadius: 6, color: '#fff', padding: '4px 8px', width: 60, fontSize: 13 },
  hint: { fontSize: 11, color: '#555', marginTop: -8, marginBottom: 10 },
}

export default function Settings() {
  const { currentUser, logout } = useAuth()
  const [inviteUrl, setInviteUrl] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [routines, setRoutines] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [addExMap, setAddExMap] = useState({})
  const [savingRoutine, setSavingRoutine] = useState({})
  const [testingSend, setTestingSend] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    water_enabled: false, water_interval_hours: 2, water_start_hour: 8, water_end_hour: 20,
    creatine_enabled: false, creatine_hour: 8,
    workout_enabled: false, workout_hour: 18,
  })
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifPermission, setNotifPermission] = useState(currentPermission())
  const pushSupported = isSupported()
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)
  const statsUrl = `${import.meta.env.VITE_API_URL ?? '/api'}/public/user/${currentUser?.id}`

  function copyStatsUrl() {
    navigator.clipboard.writeText(statsUrl).catch(() => {})
    clearTimeout(copyTimerRef.current)
    setCopied(true)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    api.get('/notifications/preferences').then(setNotifPrefs).catch(() => {})
    api.get('/routines').then(setRoutines).catch(() => {})
    api.get('/exercises').then(setAllExercises).catch(() => {})
  }, [])

  useEffect(() => () => clearTimeout(copyTimerRef.current), [])

  async function handleEnableNotifications() {
    try {
      await requestAndSubscribe()
      setNotifPermission('granted')
    } catch {
      alert('Could not enable notifications. Please check your browser settings.')
    }
  }

  async function saveNotifPrefs() {
    setNotifSaving(true)
    try {
      const utcOffset = -(new Date().getTimezoneOffset() / 60)
      const updated = await api.put('/notifications/preferences', { ...notifPrefs, utc_offset: utcOffset })
      setNotifPrefs(updated)
    } catch (err) {
      alert('Failed to save notification preferences. Please try again.')
    } finally {
      setNotifSaving(false)
    }
  }

  async function sendTestNotification() {
    setTestingSend(true)
    try {
      const { sent } = await api.post('/notifications/test')
      alert(sent > 0 ? 'Test notification sent! Check your device.' : 'No active subscription found.')
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setTestingSend(false)
    }
  }

  function setNotif(key, value) {
    setNotifPrefs(p => ({ ...p, [key]: value }))
  }

  async function generateInvite() {
    try {
      const { inviteUrl } = await api.post('/auth/invite', {})
      setInviteUrl(inviteUrl)
    } catch (err) {
      alert('Failed to generate invite link. Please try again.')
    }
  }

  async function seedDefaults() {
    setSeeding(true)
    try {
      await api.post('/routines/seed-defaults')
      const updated = await api.get('/routines')
      setRoutines(updated)
    } catch {
      alert('Failed to load templates.')
    } finally {
      setSeeding(false)
    }
  }

  async function removeExercise(routineId, exerciseId) {
    const routine = routines.find(r => r.id === routineId)
    const exerciseIds = routine.exercises.filter(e => e.id !== exerciseId).map(e => e.id)
    setSavingRoutine(p => ({ ...p, [routineId]: true }))
    try {
      const updated = await api.put(`/routines/${routineId}`, { exerciseIds })
      setRoutines(prev => prev.map(r => r.id === routineId ? updated : r))
    } finally {
      setSavingRoutine(p => ({ ...p, [routineId]: false }))
    }
  }

  async function addExercise(routineId) {
    const exId = Number(addExMap[routineId])
    if (!exId) return
    const routine = routines.find(r => r.id === routineId)
    const exerciseIds = [...routine.exercises.map(e => e.id), exId]
    setSavingRoutine(p => ({ ...p, [routineId]: true }))
    try {
      const updated = await api.put(`/routines/${routineId}`, { exerciseIds })
      setRoutines(prev => prev.map(r => r.id === routineId ? updated : r))
      setAddExMap(p => ({ ...p, [routineId]: '' }))
    } finally {
      setSavingRoutine(p => ({ ...p, [routineId]: false }))
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
      alert('Export failed. Please try again.')
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
          <div style={s.sectionLabel}>Notifications</div>
          {!pushSupported ? (
            <div style={{ fontSize: 12, color: '#555' }}>Not supported on this device/browser</div>
          ) : notifPermission !== 'granted' ? (
            <button style={s.btn()} onClick={handleEnableNotifications}>Enable Notifications</button>
          ) : (
            <div style={s.card}>
              <div style={s.toggle}>
                <span style={s.toggleLabel}>Water reminders</span>
                <input type="checkbox" style={s.toggleInput} checked={notifPrefs.water_enabled} onChange={e => setNotif('water_enabled', e.target.checked)} />
              </div>
              {notifPrefs.water_enabled && (
                <>
                  <div style={{ ...s.toggle, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Every</span>
                    <input type="number" min={1} max={8} style={s.numInput} value={notifPrefs.water_interval_hours} onChange={e => setNotif('water_interval_hours', Number(e.target.value))} />
                    <span style={{ fontSize: 12, color: '#888' }}>hrs between</span>
                    <input type="number" min={0} max={23} style={s.numInput} value={notifPrefs.water_start_hour} onChange={e => setNotif('water_start_hour', Number(e.target.value))} />
                    <span style={{ fontSize: 12, color: '#888' }}>–</span>
                    <input type="number" min={0} max={23} style={s.numInput} value={notifPrefs.water_end_hour} onChange={e => setNotif('water_end_hour', Number(e.target.value))} />
                  </div>
                  <div style={s.hint}>Hours use 24h format (e.g. 20 = 8pm)</div>
                </>
              )}

              <div style={s.toggle}>
                <span style={s.toggleLabel}>Creatine reminder</span>
                <input type="checkbox" style={s.toggleInput} checked={notifPrefs.creatine_enabled} onChange={e => setNotif('creatine_enabled', e.target.checked)} />
              </div>
              {notifPrefs.creatine_enabled && (
                <div style={{ ...s.toggle, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Daily at hour</span>
                  <input type="number" min={0} max={23} style={s.numInput} value={notifPrefs.creatine_hour} onChange={e => setNotif('creatine_hour', Number(e.target.value))} />
                </div>
              )}

              <div style={s.toggle}>
                <span style={s.toggleLabel}>Workout reminder</span>
                <input type="checkbox" style={s.toggleInput} checked={notifPrefs.workout_enabled} onChange={e => setNotif('workout_enabled', e.target.checked)} />
              </div>
              {notifPrefs.workout_enabled && (
                <div style={{ ...s.toggle, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>If no workout by hour</span>
                  <input type="number" min={0} max={23} style={s.numInput} value={notifPrefs.workout_hour} onChange={e => setNotif('workout_hour', Number(e.target.value))} />
                </div>
              )}

              <button style={s.btn()} onClick={saveNotifPrefs} disabled={notifSaving}>
                {notifSaving ? 'Saving...' : 'Save Reminders'}
              </button>
              <button style={s.btn('#252540')} onClick={sendTestNotification} disabled={testingSend}>
                {testingSend ? 'Sending...' : 'Send Test Notification'}
              </button>
            </div>
          )}
        </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Claude Personal Trainer</div>
        <div style={s.card}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Paste this URL into Claude so it can read your workout stats:
          </div>
          <div style={s.inviteUrl}>{statsUrl}</div>
          <button style={{ ...s.btn(), marginTop: 8 }} onClick={copyStatsUrl}>
            {copied ? 'Copied!' : 'Copy Stats URL'}
          </button>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Workout Templates</div>
        {routines.length === 0 ? (
          <div style={s.card}>
            <button style={s.btn()} onClick={seedDefaults} disabled={seeding}>
              {seeding ? 'Loading...' : 'Load Day A / B / C Defaults'}
            </button>
            <div style={s.hint}>Pre-fills Days A, B, C with standard exercises.</div>
          </div>
        ) : (
          <>
            {routines.map(routine => (
              <div key={routine.id} style={{ ...s.card, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{routine.name}</div>
                {routine.exercises.map(ex => (
                  <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#ccc' }}>{ex.name}</span>
                    <button
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                      onClick={() => removeExercise(routine.id, ex.id)}
                      disabled={savingRoutine[routine.id]}
                      aria-label={`Remove ${ex.name}`}
                    >×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <select
                    style={{ flex: 1, background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none' }}
                    value={addExMap[routine.id] || ''}
                    onChange={e => setAddExMap(p => ({ ...p, [routine.id]: e.target.value }))}
                  >
                    <option value="">Add exercise…</option>
                    {allExercises
                      .filter(e => !routine.exercises.find(re => re.id === e.id))
                      .map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <button
                    style={{ background: '#7c6af7', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => addExercise(routine.id)}
                    disabled={!addExMap[routine.id] || savingRoutine[routine.id]}
                  >Add</button>
                </div>
              </div>
            ))}
            <button style={{ ...s.btn('#252540'), fontSize: 12 }} onClick={seedDefaults} disabled={seeding}>
              {seeding ? 'Loading...' : 'Reset to Defaults'}
            </button>
          </>
        )}
      </div>

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
