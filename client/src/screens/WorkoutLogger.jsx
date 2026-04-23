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
  return { weight: prev?.weight ?? '', reps: prev?.reps ?? '', confirmed: false }
}

export default function WorkoutLogger() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { forPartner } = state || {}

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
      const sets = ex.sets.map((set, j) => j === setIdx ? { ...set, [field]: value, confirmed: false } : set)
      return { ...ex, sets }
    }))
  }

  function confirmSet(exIdx, setIdx) {
    setLoggedExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const sets = ex.sets.map((set, j) => {
        if (j !== setIdx) return set
        return { ...set, confirmed: true }
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
        <div key={ex.exerciseId} style={s.exerciseCard}>
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
