import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const TYPES = ['machine', 'cable', 'free_weight', 'bodyweight']
const TYPE_LABELS = { machine: 'Machine', cable: 'Cable', free_weight: 'Free Weight', bodyweight: 'Bodyweight' }
const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'core', 'arms', 'other']

const s = {
  page: { padding: '20px 4px 100px' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10 },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 10 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #252540' },
  exName: { fontSize: 14, color: '#e2e8f0' },
  exMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  globalBadge: { fontSize: 10, color: '#555', background: '#252540', borderRadius: 4, padding: '2px 6px' },
  editInput: { background: '#252540', border: '1px solid #444', borderRadius: 6, color: '#fff', padding: '4px 8px', fontSize: 13, marginRight: 4 },
  select: { background: '#252540', border: '1px solid #444', borderRadius: 6, color: '#fff', padding: '4px 8px', fontSize: 12, marginRight: 4 },
  iconBtn: (color = '#7c6af7') => ({ background: 'none', border: 'none', color, fontSize: 14, cursor: 'pointer', padding: '2px 6px' }),
  btn: (color = '#7c6af7') => ({ width: '100%', padding: 13, background: color, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }),
  formRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  formInput: { flex: 1, minWidth: 120, background: '#252540', border: '1px solid #444', borderRadius: 8, color: '#fff', padding: '8px 10px', fontSize: 13 },
  formSelect: { background: '#252540', border: '1px solid #444', borderRadius: 8, color: '#fff', padding: '8px 10px', fontSize: 13 },
}

export default function ExerciseManager() {
  const { currentUser } = useAuth()
  const [exercises, setExercises] = useState([])
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [newEx, setNewEx] = useState({ name: '', muscle_group: 'other', exercise_type: 'machine' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/exercises').then(setExercises).catch(() => {})
  }, [])

  const grouped = TYPES.reduce((acc, type) => {
    acc[type] = exercises.filter(e => e.exercise_type === type)
    return acc
  }, {})

  const uncategorized = exercises.filter(e => !e.exercise_type)

  function startEdit(ex) {
    setEditId(ex.id)
    setEditData({ name: ex.name, muscle_group: ex.muscle_group || 'other', exercise_type: ex.exercise_type || 'machine' })
  }

  async function saveEdit(id) {
    setSaving(true)
    try {
      const updated = await api.put(`/exercises/${id}`, editData)
      setExercises(prev => prev.map(e => e.id === id ? updated : e))
      setEditId(null)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEx(id) {
    if (!confirm('Delete this exercise?')) return
    try {
      await api.delete(`/exercises/${id}`)
      setExercises(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  async function createEx() {
    if (!newEx.name.trim()) return
    setSaving(true)
    try {
      const created = await api.post('/exercises', newEx)
      setExercises(prev => [...prev, created])
      setNewEx({ name: '', muscle_group: 'other', exercise_type: 'machine' })
    } catch (err) {
      alert('Failed to create: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function ExerciseRow({ ex }) {
    const isOwn = ex.created_by === currentUser.id
    const isEditing = editId === ex.id

    if (isEditing) {
      return (
        <div style={{ ...s.row, flexWrap: 'wrap', gap: 6 }}>
          <input
            style={s.editInput}
            value={editData.name}
            onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
            placeholder="Exercise name"
          />
          <select style={s.select} value={editData.exercise_type} onChange={e => setEditData(d => ({ ...d, exercise_type: e.target.value }))}>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <select style={s.select} value={editData.muscle_group} onChange={e => setEditData(d => ({ ...d, muscle_group: e.target.value }))}>
            {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button style={s.iconBtn('#10b981')} onClick={() => saveEdit(ex.id)} disabled={saving}>✓</button>
          <button style={s.iconBtn('#555')} onClick={() => setEditId(null)}>✕</button>
        </div>
      )
    }

    return (
      <div style={s.row}>
        <div>
          <div style={s.exName}>{ex.name}</div>
          <div style={s.exMeta}>{ex.muscle_group || '—'}</div>
        </div>
        {isOwn ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={s.iconBtn('#7c6af7')} onClick={() => startEdit(ex)}>✎</button>
            <button style={s.iconBtn('#ef4444')} onClick={() => deleteEx(ex.id)}>✕</button>
          </div>
        ) : (
          <span style={s.globalBadge}>global</span>
        )}
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Exercise Library</div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Add Custom Exercise</div>
        <div style={s.card}>
          <div style={s.formRow}>
            <input
              style={s.formInput}
              placeholder="Exercise name"
              value={newEx.name}
              onChange={e => setNewEx(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createEx()}
            />
          </div>
          <div style={s.formRow}>
            <select style={s.formSelect} value={newEx.exercise_type} onChange={e => setNewEx(d => ({ ...d, exercise_type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select style={s.formSelect} value={newEx.muscle_group} onChange={e => setNewEx(d => ({ ...d, muscle_group: e.target.value }))}>
              {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <button style={s.btn()} onClick={createEx} disabled={saving || !newEx.name.trim()}>
            {saving ? 'Adding...' : 'Add Exercise'}
          </button>
        </div>
      </div>

      {TYPES.map(type => {
        const list = grouped[type]
        if (!list?.length) return null
        return (
          <div key={type} style={s.section}>
            <div style={s.sectionLabel}>{TYPE_LABELS[type]} ({list.length})</div>
            <div style={s.card}>
              {list.map(ex => <ExerciseRow key={ex.id} ex={ex} />)}
            </div>
          </div>
        )
      })}

      {uncategorized.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionLabel}>Other ({uncategorized.length})</div>
          <div style={s.card}>
            {uncategorized.map(ex => <ExerciseRow key={ex.id} ex={ex} />)}
          </div>
        </div>
      )}
    </div>
  )
}
