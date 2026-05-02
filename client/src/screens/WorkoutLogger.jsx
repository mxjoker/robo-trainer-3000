import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { parseClaudeTemplate } from '../utils/parseClaudeTemplate'

const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'hamstrings', 'core', 'other']

const s = {
  page: { padding: '16px 4px 100px' },
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
  exercisePicker: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: 8, color: '#fff', fontSize: 14, width: '100%', marginBottom: 6, outline: 'none' },
  cantFindLink: { background: 'none', border: 'none', color: '#7c6af7', fontSize: 12, cursor: 'pointer', padding: '4px 0', marginBottom: 12, display: 'block', textAlign: 'left' },
  newExForm: { background: '#1a1a2e', border: '1px solid #333', borderRadius: 10, padding: 14, marginBottom: 12 },
  newExInput: { background: '#252540', border: '1px solid #333', borderRadius: 6, padding: '9px 12px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', marginBottom: 8 },
  newExSelect: { background: '#252540', border: '1px solid #333', borderRadius: 6, padding: '9px 12px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', marginBottom: 8 },
  newExCheckRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#ccc' },
  newExActions: { display: 'flex', gap: 8 },
  addLogBtn: { flex: 1, background: '#7c6af7', border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelLink: { background: 'none', border: 'none', color: '#7c6af7', fontSize: 12, cursor: 'pointer', padding: '10px 8px' },
}

function makeSet(prev = null) {
  return { weight: prev?.weight ?? '', reps: prev?.reps ?? '10', confirmed: false }
}

export default function WorkoutLogger() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { forPartner } = state || {}

  const [allExercises, setAllExercises] = useState([])
  const [workoutId, setWorkoutId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState('')
  const [newIsPT, setNewIsPT] = useState(false)
  const [addingNew, setAddingNew] = useState(false)

  // Each entry: { exerciseId, exerciseName, sets: [{ weight, reps, confirmed }] }
  const [loggedExercises, setLoggedExercises] = useState([])
  const [mobilityExpanded, setMobilityExpanded] = useState(false)
  const [mobilitySets, setMobilitySets] = useState([])
  const [mobilityPickerExId, setMobilityPickerExId] = useState('')
  const [mobilityDurationInput, setMobilityDurationInput] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [pasteExpanded, setPasteExpanded] = useState(false)
  const [weightModalDone, setWeightModalDone] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [routines, setRoutines] = useState([])
  const [prs, setPrs] = useState({})
  const [partnerPrs, setPartnerPrs] = useState({})

  useEffect(() => {
    api.get('/exercises').then(setAllExercises)
    api.get('/routines').then(setRoutines).catch(() => {})
    api.get('/exercises/prs').then(setPrs).catch(() => {})
    if (forPartner) api.get('/partner/exercises/prs').then(setPartnerPrs).catch(() => {})
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

  async function addNewAndLog() {
    if (!newName.trim()) return
    setAddingNew(true)
    try {
      const ex = await api.post('/exercises', {
        name: newName.trim(),
        muscle_group: newMuscle || undefined,
        is_pt_exercise: newIsPT
      })
      setAllExercises(prev => [...prev, ex])
      setLoggedExercises(prev => [...prev, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: [makeSet()]
      }])
      setNewName('')
      setNewMuscle('')
      setNewIsPT(false)
      setShowNewForm(false)
      setShowPicker(false)
    } catch (err) {
      alert('Error creating exercise: ' + err.message)
    } finally {
      setAddingNew(false)
    }
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

  async function addMobilitySet() {
    if (!mobilityPickerExId || !mobilityDurationInput || !workoutId) return
    const ex = allExercises.find(e => e.id === Number(mobilityPickerExId))
    if (!ex) return
    try {
      const result = await api.post(`/workouts/${workoutId}/mobility`, {
        exercise_id: ex.id,
        duration_seconds: Number(mobilityDurationInput),
        sort_order: mobilitySets.length,
      })
      setMobilitySets(prev => [...prev, result])
      setMobilityPickerExId('')
      setMobilityDurationInput('')
    } catch (err) {
      alert('Error adding mobility exercise: ' + err.message)
    }
  }

  async function removeMobilitySet(setId) {
    try {
      await api.delete(`/workouts/${workoutId}/mobility/${setId}`)
      setMobilitySets(prev => prev.filter(s => s.id !== setId))
    } catch (err) {
      alert('Error removing mobility exercise: ' + err.message)
    }
  }

  async function saveNotes() {
    if (!workoutId || workoutNotes === '') return
    try {
      await api.put(`/workouts/${workoutId}`, { notes: workoutNotes })
    } catch {
      // silent fail — notes are non-critical
    }
  }

  async function handleImport() {
    const { parsed, unrecognized } = parseClaudeTemplate(importText, allExercises)
    if (parsed.length === 0) {
      alert('No exercises found. Check the format: "Exercise Name: 3x8 @ 185"')
      return
    }
    setImporting(true)
    try {
      const createdExercises = []
      for (const entry of parsed) {
        let exerciseId = entry.exerciseId
        let exerciseName = entry.exerciseName
        if (exerciseId === null) {
          const ex = await api.post('/exercises', { name: exerciseName, muscle_group: 'other' })
          exerciseId = ex.id
          exerciseName = ex.name
          createdExercises.push(ex)
        }
        setLoggedExercises(prev => {
          if (prev.find(e => e.exerciseId === exerciseId)) return prev
          return [...prev, {
            exerciseId,
            exerciseName,
            sets: Array.from({ length: entry.sets }, () => ({
              weight: entry.weight !== null ? String(entry.weight) : '',
              reps: String(entry.reps),
              confirmed: true,
            })),
          }]
        })
      }
      if (createdExercises.length > 0) {
        setAllExercises(prev => [...prev, ...createdExercises])
      }
      setPasteExpanded(false)
      setImportText('')
      if (unrecognized.length > 0) {
        alert(`Imported ${parsed.length} exercise(s). ${unrecognized.length} line(s) couldn't be parsed.`)
      }
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  function loadTemplate(routine) {
    const activePrs = forPartner ? partnerPrs : prs
    setLoggedExercises(routine.exercises.map(ex => {
      const defaultW = Number(ex.default_weight_lbs)
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: Array.from({ length: ex.default_sets ?? 3 }, () => ({
          weight: activePrs[ex.id] != null
            ? String(activePrs[ex.id])
            : (defaultW > 0 ? String(defaultW) : ''),
          reps: String(ex.default_reps ?? 10),
          confirmed: false,
        })),
      }
    }))
  }

  async function submitWeight() {
    const today = new Date().toISOString().split('T')[0]
    if (weightInput) {
      try {
        await api.post('/metrics', { weight_lbs: Number(weightInput), date: today })
      } catch {
        // non-critical
      }
    }
    setWeightModalDone(true)
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
      {!weightModalDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 200 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 14, padding: 24, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Log today's weight?</div>
            <input
              style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 16, outline: 'none', width: '100%' }}
              type="number"
              inputMode="decimal"
              placeholder="lbs (optional)"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              autoFocus
            />
            <button
              style={{ background: '#7c6af7', border: 'none', borderRadius: 10, padding: 13, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              onClick={submitWeight}
            >
              {weightInput ? 'Log & Start Workout' : 'Skip'}
            </button>
          </div>
        </div>
      )}
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

      {loggedExercises.length === 0 && (
        <>
          {routines.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 8 }}>Load a template</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {routines.map(r => (
                  <button
                    key={r.id}
                    style={{ background: '#1a1a2e', border: '1px solid #252540', borderRadius: 10, padding: '10px 14px', color: '#a090ff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => loadTemplate(r)}
                  >
                    {r.name.replace(/\s*—.*/, '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!pasteExpanded ? (
            <button
              data-testid="import-banner-btn"
              style={{ border: '1px dashed #4db6f755', borderRadius: 10, padding: 12, color: '#4db6f7', fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 8, background: '#4db6f710' }}
              onClick={() => setPasteExpanded(true)}
            >
              📋 Paste workout text
            </button>
          ) : (
            <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4db6f7', marginBottom: 8 }}>Paste workout text</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Format: "Exercise Name: 3x8 @ 185"</div>
              <textarea
                aria-label="Paste Claude template"
                style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, minHeight: 120, outline: 'none', resize: 'none', width: '100%', marginBottom: 8 }}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={'Bench Press: 3x8 @ 185\nSquat: 3x5 @ 225\nPull-up: 3x8'}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  data-testid="import-submit-btn"
                  style={{ flex: 1, background: '#7c6af7', border: 'none', borderRadius: 10, padding: 11, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={handleImport}
                  disabled={importing || !importText.trim()}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
                <button
                  data-testid="import-cancel-btn"
                  style={{ background: 'none', border: 'none', color: '#7c6af7', fontSize: 13, cursor: 'pointer', padding: '11px 8px' }}
                  onClick={() => { setPasteExpanded(false); setImportText('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', color: '#555', fontSize: 12, marginBottom: 12 }}>
            — or add exercises below —
          </div>
        </>
      )}

      {showPicker ? (
        <>
          {showNewForm ? (
            <div style={s.newExForm}>
              <input
                style={s.newExInput}
                placeholder="Exercise name (required)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                aria-label="Exercise name"
              />
              <select
                style={s.newExSelect}
                value={newMuscle}
                onChange={e => setNewMuscle(e.target.value)}
                aria-label="Muscle group"
              >
                <option value="">Muscle group (optional)</option>
                {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
              <label style={s.newExCheckRow}>
                <input
                  type="checkbox"
                  checked={newIsPT}
                  onChange={e => setNewIsPT(e.target.checked)}
                  aria-label="PT/rehab exercise"
                />
                PT / rehab exercise
              </label>
              <div style={s.newExActions}>
                <button style={s.addLogBtn} onClick={addNewAndLog} disabled={addingNew || !newName.trim()}>
                  {addingNew ? 'Adding...' : 'Add & Log'}
                </button>
                <button style={s.cancelLink} onClick={() => setShowNewForm(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <select style={s.exercisePicker} onChange={e => addExercise(e.target.value)} defaultValue="">
                <option value="" disabled>Select exercise...</option>
                {allExercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
              <button style={s.cantFindLink} onClick={() => setShowNewForm(true)}>+ Can't find it? Add new</button>
            </>
          )}
        </>
      ) : (
        <button style={s.addExBtn} onClick={() => setShowPicker(true)}>+ Add Exercise</button>
      )}

      {!mobilityExpanded ? (
        <button
          data-testid="mobility-expand-btn"
          style={{ background: 'none', border: '1px dashed #333', borderRadius: 10, padding: 12, color: '#555', fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 12 }}
          onClick={() => setMobilityExpanded(true)}
        >
          ＋ Add Mobility / Stretching
        </button>
      ) : (
        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4db6f7', marginBottom: 12 }}>Mobility &amp; Stretching</div>
          {mobilitySets.map(ms => (
            <div key={ms.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#ccc' }}>{ms.exercise_name}</span>
              <span style={{ fontSize: 13, color: '#888' }}>
                {ms.duration_seconds}s
                <button
                  style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', marginLeft: 8, fontSize: 16, lineHeight: 1 }}
                  onClick={() => removeMobilitySet(ms.id)}
                  aria-label={`Remove ${ms.exercise_name}`}
                >×</button>
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select
              style={{ ...s.exercisePicker, flex: 1, marginBottom: 0 }}
              value={mobilityPickerExId}
              onChange={e => setMobilityPickerExId(e.target.value)}
              aria-label="Mobility exercise"
            >
              <option value="" disabled>Pick exercise…</option>
              {allExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <input
              style={{ ...s.input, width: 70 }}
              type="number"
              inputMode="numeric"
              value={mobilityDurationInput}
              onChange={e => setMobilityDurationInput(e.target.value)}
              placeholder="sec"
              aria-label="Duration in seconds"
            />
            <button
              data-testid="add-mobility-btn"
              style={{ background: '#7c6af7', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onClick={addMobilitySet}
              disabled={!mobilityPickerExId || !mobilityDurationInput}
            >Add</button>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#555', letterSpacing: '0.5px', marginBottom: 6 }}>Notes (optional)</div>
            <textarea
              style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', resize: 'none', minHeight: 60 }}
              value={workoutNotes}
              onChange={e => setWorkoutNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="How did it feel?"
              aria-label="Workout notes"
            />
          </div>
        </div>
      )}

      <button style={s.finishBtn} onClick={finish} disabled={saving}>
        {saving ? 'Saving...' : 'Finish Workout'}
      </button>

    </div>
  )
}
