import { useEffect, useState } from 'react'
import { api } from '../api/client'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 },
  sub: { fontSize: 13, color: '#666', marginBottom: 20 },
  card: { background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 10 },
  workoutHeader: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  meta: { fontSize: 11, color: '#666' },
  exerciseName: { fontSize: 12, color: '#888', marginTop: 6 },
  setLine: { fontSize: 11, color: '#555', marginLeft: 8 },
  wellnessRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 },
  wellnessCell: { background: '#1a1a2e', borderRadius: 8, padding: 10, textAlign: 'center' },
  cellLabel: { fontSize: 10, textTransform: 'uppercase', color: '#555', marginBottom: 3 },
  noPartner: { color: '#555', fontSize: 14, textAlign: 'center', padding: 40 }
}

export default function Partner() {
  const [profile, setProfile] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [wellness, setWellness] = useState([])
  const [noPartner, setNoPartner] = useState(false)

  useEffect(() => {
    api.get('/partner/profile')
      .then(p => {
        setProfile(p)
        return Promise.all([api.get('/partner/workouts'), api.get('/partner/wellness')])
      })
      .then(([w, we]) => { setWorkouts(w.slice(0, 10)); setWellness(we.slice(0, 7)) })
      .catch(() => setNoPartner(true))
  }, [])

  if (noPartner) return (
    <div style={s.page}>
      <div style={s.title}>Partner</div>
      <div style={s.noPartner}>No partner linked yet. Share your invite link from Settings.</div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.title}>{profile?.name || '...'}</div>
      <div style={s.sub}>Recent activity</div>

      {wellness.length > 0 && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', marginBottom: 8 }}>Latest wellness</div>
          <div style={s.wellnessRow}>
            <div style={s.wellnessCell}>
              <div style={s.cellLabel}>Pain</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f7a76c' }}>{wellness[0].pain_level}</div>
            </div>
            <div style={s.wellnessCell}>
              <div style={s.cellLabel}>Energy</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#7c6af7' }}>{wellness[0].energy_level}</div>
            </div>
            <div style={s.wellnessCell}>
              <div style={s.cellLabel}>Mood</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{wellness[0].mood}</div>
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', marginBottom: 8, marginTop: 4 }}>Recent workouts</div>
      {workouts.length === 0 && <div style={s.meta}>No workouts yet</div>}
      {workouts.map(w => (
        <div key={w.id} style={s.card}>
          <div style={s.workoutHeader}>{new Date(w.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          {w.notes && <div style={s.meta}>{w.notes}</div>}
          {w.sets && [...new Set(w.sets.map(set => set.exercise_id))].map(exId => {
            const exSets = w.sets.filter(set => set.exercise_id === exId)
            return (
              <div key={exId}>
                <div style={s.exerciseName}>{exSets[0].exercise_name}</div>
                {exSets.map((set, i) => (
                  <div key={i} style={s.setLine}>Set {set.set_number}: {set.weight_lbs} lbs × {set.reps}</div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
