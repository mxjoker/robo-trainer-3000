import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { parseClaudeTemplate } from '../utils/parseClaudeTemplate'

const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'hamstrings', 'core', 'other']

const COL = { joe: 'var(--accent)', partner: '#f472b6' }

const s = {
  page: { padding: '16px 4px 100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: 700 },
  backBtn: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer' },
  sharedBadge: { background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 20, padding: '4px 12px', color: 'var(--accent-dim)', fontSize: 11, marginBottom: 14, display: 'inline-block' },
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
  addExBtn: { background: '#1a1a2e', border: '1px solid #252540', borderRadius: 10, padding: 12, color: 'var(--accent)', fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 12, fontWeight: 600 },
  finishBtn: { background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
  picker: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: 8, color: '#fff', fontSize: 14, width: '100%', marginBottom: 6, outline: 'none' },
  cantFindLink: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', padding: '4px 0', marginBottom: 12, display: 'block', textAlign: 'left' },
  newExForm: { background: '#1a1a2e', border: '1px solid #333', borderRadius: 10, padding: 14, marginBottom: 12 },
  newExInput: { background: '#252540', border: '1px solid #333', borderRadius: 6, padding: '9px 12px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', marginBottom: 8 },
  newExSelect: { background: '#252540', border: '1px solid #333', borderRadius: 6, padding: '9px 12px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', marginBottom: 8 },
  newExCheckRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#ccc' },
  newExActions: { display: 'flex', gap: 8 },
  addLogBtn: { flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelLink: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', padding: '10px 8px' },
}

function makeSet(prev = null) {
  return {
    joe: { weight: prev?.joe.weight ?? '', reps: prev?.joe.reps ?? '10' },
    partner: { weight: prev?.partner.weight ?? '', reps: prev?.partner.reps ?? '10' },
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
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState('')
  const [newIsPT, setNewIsPT] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [weightModalDone, setWeightModalDone] = useState(false)
  const [joeWeightInput, setJoeWeightInput] = useState('')
  const [sydneyWeightInput, setSydneyWeightInput] = useState('')
  const [routines, setRoutines] = useState([])
  const [joePrs, setJoePrs] = useState({})
  const [partnerPrs, setPartnerPrs] = useState({})

  useEffect(() => {
    api.get('/exercises').then(setAllExercises)
    api.get('/routines').then(setRoutines).catch(() => {})
    api.get('/exercises/prs').then(setJoePrs).catch(() => {})
    api.get('/partner/exercises/prs').then(setPartnerPrs).catch(() => {})
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
      setLoggedExercises(prev => [...prev, { exerciseId: ex.id, exerciseName: ex.name, sets: [makeSet()] }])
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

  function loadTemplate(routine) {
    setLoggedExercises(routine.exercises.map(ex => {
      const defaultW = Number(ex.default_weight_lbs)
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: Array.from({ length: ex.default_sets ?? 3 }, () => ({
          joe: {
            weight: joePrs[ex.id] != null ? String(joePrs[ex.id]) : (defaultW > 0 ? String(defaultW) : ''),
            reps: String(ex.default_reps ?? 10),
          },
          partner: {
            weight: partnerPrs[ex.id] != null ? String(partnerPrs[ex.id]) : '',
            reps: String(ex.default_reps ?? 10),
          },
          confirmed: false,
        })),
      }
    }))
  }

  async function submitWeights() {
    const today = new Date().toISOString().split('T')[0]
    try {
      if (joeWeightInput) await api.post('/metrics', { weight_lbs: Number(joeWeightInput), date: today })
      if (sydneyWeightInput) await api.post('/partner/metrics', { weight_lbs: Number(sydneyWeightInput), date: today })
    } catch {
      // non-critical
    }
    setWeightModalDone(true)
  }

  async function handleImport() {
    const { parsed, unrecognized } = parseClaudeTemplate(importText, allExercises)
    if (parsed.length === 0) {
      alert('No exercises found. Format: "Leg Press: 3x10 @ 150 / 40"')
      return
    }
    setImporting(true)
    try {
      const created = []
      for (const entry of parsed) {
        let exerciseId = entry.exerciseId
        let exerciseName = entry.exerciseName
        if (exerciseId === null) {
          const ex = await api.post('/exercises', { name: exerciseName, muscle_group: 'other' })
          exerciseId = ex.id
          exerciseName = ex.name
          created.push(ex)
        }
        setLoggedExercises(prev => {
          if (prev.find(e => e.exerciseId === exerciseId)) return prev
          return [...prev, {
            exerciseId,
            exerciseName,
            sets: Array.from({ length: entry.sets }, () => ({
              joe: { weight: entry.weight !== null ? String(entry.weight) : '', reps: String(entry.reps) },
              partner: { weight: entry.partnerWeight !== null ? String(entry.partnerWeight) : (entry.weight !== null ? String(entry.weight) : ''), reps: String(entry.reps) },
              confirmed: true,
            })),
          }]
        })
      }
      if (created.length) setAllExercises(prev => [...prev, ...created])
      setImportModalOpen(false)
      setImportText('')
      if (unrecognized.length > 0) {
        alert(`Imported ${parsed.length} exercise(s). ${unrecognized.length} line(s) skipped.`)
      }
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
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
            await api.post(`/partner/workouts/${partnerWorkoutId}/sets`, {
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
      {!weightModalDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 200 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 14, padding: 24, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Log today's weight?</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6, fontWeight: 600 }}>{currentUser?.name?.split(' ')[0] || 'Joe'}</div>
              <input
                style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 16, outline: 'none', width: '100%' }}
                type="number" inputMode="decimal" placeholder="lbs (optional)"
                value={joeWeightInput} onChange={e => setJoeWeightInput(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#f472b6', marginBottom: 6, fontWeight: 600 }}>{currentUser?.partner_name?.split(' ')[0] || 'Partner'}</div>
              <input
                style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 16, outline: 'none', width: '100%' }}
                type="number" inputMode="decimal" placeholder="lbs (optional)"
                value={sydneyWeightInput} onChange={e => setSydneyWeightInput(e.target.value)}
              />
            </div>
            <button
              style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 13, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              onClick={submitWeights}
            >
              {(joeWeightInput || sydneyWeightInput) ? 'Log & Start Workout' : 'Skip'}
            </button>
          </div>
        </div>
      )}
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

      {loggedExercises.length === 0 && (
        <>
          {routines.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 8 }}>Load a template</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {routines.map(r => (
                  <button
                    key={r.id}
                    style={{ background: '#1a1a2e', border: '1px solid #252540', borderRadius: 10, padding: '10px 14px', color: 'var(--accent-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => loadTemplate(r)}
                  >
                    {r.name.replace(/\s*—.*/, '')}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            style={{
              border: '1px dashed #f472b655', borderRadius: 10, padding: 12, color: '#f472b6',
              fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 8, background: '#f472b610',
            }}
            onClick={() => setImportModalOpen(true)}
          >
            📋 Import from template (Joe / Sydney weights)
          </button>
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
              <select style={s.picker} onChange={e => addExercise(e.target.value)} defaultValue="">
                <option value="" disabled>Select exercise...</option>
                {allExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
              <button style={s.cantFindLink} onClick={() => setShowNewForm(true)}>+ Can't find it? Add new</button>
            </>
          )}
        </>
      ) : (
        <button style={s.addExBtn} onClick={() => setShowPicker(true)}>+ Add Exercise</button>
      )}

      <button style={s.finishBtn} onClick={finish} disabled={saving}>
        {saving ? 'Saving...' : 'Finish Shared Workout'}
      </button>

      {importModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', padding: '60px 16px 20px', zIndex: 100 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Import Shared Template</div>
            <div style={{ fontSize: 12, color: '#888' }}>Format: "Leg Press: 3x10 @ 150 / 40" (Joe weight / Sydney weight)</div>
            <textarea
              style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, minHeight: 160, outline: 'none', resize: 'none', width: '100%' }}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={'Leg Press: 3x10 @ 150 / 40\nChest Press Machine: 3x10 @ 100 / 55'}
              aria-label="Paste shared template"
            />
            <button
              style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: 13, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              onClick={handleImport}
              disabled={importing || !importText.trim()}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 8 }}
              onClick={() => { setImportModalOpen(false); setImportText('') }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
