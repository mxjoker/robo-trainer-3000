import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const PAIN_AREAS = ['Knee', 'Back', 'Shoulder', 'Hip', 'Neck', 'General Fatigue', 'Wrist', 'Ankle']

const s = {
  page: { padding: '16px 4px 100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 700 },
  backBtn: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer' },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 14 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10, display: 'block' },
  slider: { width: '100%', accentColor: 'var(--accent)', height: 4, marginBottom: 4 },
  sliderValue: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: (active) => ({
    padding: '6px 12px', borderRadius: 20, fontSize: 12,
    background: active ? 'var(--accent)' : '#252540',
    color: active ? '#fff' : '#888',
    border: `1px solid ${active ? 'var(--accent)' : '#333'}`,
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
  saveBtn: { background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
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

  useEffect(() => {
    api.get('/wellness/today').then(log => {
      if (!log) return
      if (log.pain_level != null) setPain(log.pain_level)
      if (log.energy_level != null) setEnergy(log.energy_level)
      if (log.mood != null) setMood(log.mood)
      if (log.sleep_hours != null) setSleep(String(log.sleep_hours))
      if (log.water_oz != null) setWater(String(log.water_oz))
      if (log.creatine_taken != null) setCreatine(log.creatine_taken)
      if (Array.isArray(log.pain_areas)) setPainAreas(log.pain_areas)
      if (log.notes) setNotes(log.notes)
    }).catch(() => {})
  }, [])

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
        notes: notes || null,
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
