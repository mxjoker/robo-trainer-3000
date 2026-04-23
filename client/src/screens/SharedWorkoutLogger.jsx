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
  addExBtn: { background: '#1a1a2e', border: '1px solid #252540', borderRadius: 10, padding: 12, color: '#7c6af7', fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 12, fontWeight: 600 },
  finishBtn: { background: '#7c6af7', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
  picker: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: 8, color: '#fff', fontSize: 14, width: '100%', marginBottom: 12, outline: 'none' }
}

function makeSet(prev = null) {
  return {
    joe: { weight: prev?.joe.weight ?? '', reps: prev?.joe.reps ?? '' },
    partner: { weight: prev?.partner.weight ?? '', reps: prev?.partner.reps ?? '' },
    confirmed: false
  }
}

export default function SharedWorkoutLogger() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const partnerName = currentUser?.partner_name || 'Partner'

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
      const sets = ex.sets.map((set, j) => j === setIdx ? { ...set, [person]: { ...set[person], [field]: value }, confirmed: false } : set)
      return { ...ex, sets }
    }))
  }

  function confirmSet(exIdx, setIdx) {
    setLoggedExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((set, j) => j === setIdx ? { ...set, confirmed: true } : set)
      const isLast = setIdx === ex.sets.length - 1
      const newSets = isLast ? [...sets, makeSet(sets[setIdx])] : sets
      return { ...ex, sets: newSets }
    }))
  }

  async function finish() {
    setSaving(true)
    try {
      for (const ex of loggedExercises) {
        const confirmedSets = ex.sets.filter(set => set.confirmed)
        for (let i = 0; i < confirmedSets.length; i++) {
          const set = confirmedSets[i]
          if (joeWorkoutId) {
            await api.post(`/workouts/${joeWorkoutId}/sets`, {
              exercise_id: ex.exerciseId, set_number: i + 1,
              weight_lbs: set.joe.weight !== '' ? Number(set.joe.weight) : null,
              reps: set.joe.reps !== '' ? Number(set.joe.reps) : null
            })
          }
          if (partnerWorkoutId) {
            await api.post(`/workouts/${partnerWorkoutId}/sets`, {
              exercise_id: ex.exerciseId, set_number: i + 1,
              weight_lbs: set.partner.weight !== '' ? Number(set.partner.weight) : null,
              reps: set.partner.reps !== '' ? Number(set.partner.reps) : null
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

  if (!currentUser) return null

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
        <div key={ex.exerciseId} style={s.exerciseCard}>
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
