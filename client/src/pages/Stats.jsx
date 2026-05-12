import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'

const s = {
  page: { padding: '16px 8px 100px' },
  personRow: { display: 'flex', gap: 8, marginBottom: 16 },
  personBtn: (active) => ({
    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? 'var(--accent)' : '#1a1a2e',
    color: active ? '#fff' : '#666'
  }),
  tabs: { display: 'flex', background: '#1a1a2e', borderRadius: 10, padding: 3, marginBottom: 20 },
  tab: (active) => ({
    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : '#666'
  }),
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 12 },
  select: { background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: '100%', marginBottom: 14, outline: 'none' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 14 },
  filterBtn: (active) => ({
    padding: '6px 12px', borderRadius: 20, border: `1px solid ${active ? 'var(--accent)' : '#333'}`,
    background: active ? 'var(--accent-bg)' : 'transparent', color: active ? 'var(--accent-dim)' : '#666',
    fontSize: 11, cursor: 'pointer'
  }),
  statRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 700 },
  statSub: { fontSize: 10, textTransform: 'uppercase', color: '#555', letterSpacing: '0.5px', marginTop: 2 },
  prRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #252540', marginBottom: 8 },
  prName: { fontSize: 13, color: '#fff' },
  prWeight: { fontSize: 13, fontWeight: 700, color: '#4caf8a' },
  legendRow: { display: 'flex', gap: 14, marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#666' },
  legendLine: (color) => ({ width: 12, height: 2, background: color, borderRadius: 1 })
}

const FILTERS = ['7d', '30d', '90d', 'All']

function tooltipStyle() {
  return {
    contentStyle: { background: '#1a1a2e', border: '1px solid #252540', borderRadius: 6, fontSize: 11 },
    itemStyle: { color: '#fff' },
    labelStyle: { color: '#666' }
  }
}

export default function Stats() {
  const [person, setPerson] = useState('me')
  const [partnerName, setPartnerName] = useState(null)

  const [activeTab, setActiveTab] = useState('strength')

  // My data
  const [exercises, setExercises] = useState([])
  const [selectedExId, setSelectedExId] = useState('')
  const [strengthData, setStrengthData] = useState([])
  const [prs, setPrs] = useState([])
  const [healthFilter, setHealthFilter] = useState('30d')
  const [healthData, setHealthData] = useState([])
  const [consistency, setConsistency] = useState(null)

  // My workouts feed
  const [myWorkouts, setMyWorkouts] = useState([])

  // Partner data
  const [partnerPrs, setPartnerPrs] = useState([])
  const [partnerSelectedExId, setPartnerSelectedExId] = useState('')
  const [partnerStrengthData, setPartnerStrengthData] = useState([])
  const [partnerHealthFilter, setPartnerHealthFilter] = useState('30d')
  const [partnerHealthData, setPartnerHealthData] = useState([])
  const [partnerConsistency, setPartnerConsistency] = useState(null)
  const [partnerWorkouts, setPartnerWorkouts] = useState([])

  // On mount: fetch my data + partner data (all independent so one failure doesn't block others)
  useEffect(() => {
    api.get('/exercises').then(exs => {
      setExercises(exs)
      if (exs.length) setSelectedExId(String(exs[0].id))
    }).catch(() => {})
    api.get('/stats/prs').then(setPrs).catch(() => {})
    api.get('/stats/consistency').then(setConsistency).catch(() => {})
    api.get('/workouts').then(ws => setMyWorkouts(ws.slice(0, 5))).catch(() => {})

    api.get('/partner/profile').then(p => setPartnerName(p.name)).catch(() => {})
    api.get('/partner/stats/prs').then(pPrs => {
      setPartnerPrs(pPrs)
      if (pPrs.length) setPartnerSelectedExId(String(pPrs[0].exercise_id))
    }).catch(() => {})
    api.get('/partner/stats/consistency').then(setPartnerConsistency).catch(() => {})
    api.get('/partner/workouts').then(ws => setPartnerWorkouts(ws.slice(0, 5))).catch(() => {})
  }, [])

  // My strength chart
  useEffect(() => {
    if (!selectedExId) return
    api.get(`/stats/strength/${selectedExId}`).then(setStrengthData).catch(() => {})
  }, [selectedExId])

  // My health chart
  useEffect(() => {
    if (healthFilter === 'All') {
      api.get('/stats/health').then(setHealthData).catch(() => {})
    } else {
      const days = healthFilter === '7d' ? 7 : healthFilter === '30d' ? 30 : 90
      const start = new Date(); start.setDate(start.getDate() - days)
      api.get(`/stats/health?start=${start.toISOString().split('T')[0]}`).then(setHealthData).catch(() => {})
    }
  }, [healthFilter])

  // Partner strength chart
  useEffect(() => {
    if (!partnerSelectedExId) return
    api.get(`/partner/stats/strength/${partnerSelectedExId}`).then(setPartnerStrengthData).catch(() => {})
  }, [partnerSelectedExId])

  // Partner health chart
  useEffect(() => {
    if (partnerHealthFilter === 'All') {
      api.get('/partner/stats/health').then(setPartnerHealthData).catch(() => {})
    } else {
      const days = partnerHealthFilter === '7d' ? 7 : partnerHealthFilter === '30d' ? 30 : 90
      const start = new Date(); start.setDate(start.getDate() - days)
      api.get(`/partner/stats/health?start=${start.toISOString().split('T')[0]}`).then(setPartnerHealthData).catch(() => {})
    }
  }, [partnerHealthFilter])

  const isPartner = person === 'partner'
  const activePrs = isPartner ? partnerPrs : prs
  const activeConsistency = isPartner ? partnerConsistency : consistency
  const activeExercises = isPartner
    ? partnerPrs.map(pr => ({ id: pr.exercise_id, name: pr.exercise_name }))
    : exercises
  const activeSelectedExId = isPartner ? partnerSelectedExId : selectedExId
  const setActiveSelectedExId = isPartner ? setPartnerSelectedExId : setSelectedExId
  const activeStrengthData = isPartner ? partnerStrengthData : strengthData
  const activeHealthFilter = isPartner ? partnerHealthFilter : healthFilter
  const setActiveHealthFilter = isPartner ? setPartnerHealthFilter : setHealthFilter
  const activeHealthData = isPartner ? partnerHealthData : healthData
  const activeWorkouts = isPartner ? partnerWorkouts : myWorkouts

  return (
    <div style={s.page}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 16 }}>Stats</div>

      {partnerName && (
        <div style={s.personRow}>
          <button style={s.personBtn(person === 'me')} onClick={() => setPerson('me')}>Me</button>
          <button style={s.personBtn(person === 'partner')} onClick={() => setPerson('partner')}>{partnerName}</button>
        </div>
      )}

      <div style={s.tabs}>
        {['strength', 'health', 'consistency', 'workouts'].map(tab => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'strength' && (
        <>
          <select
            style={s.select}
            value={activeSelectedExId}
            onChange={e => setActiveSelectedExId(e.target.value)}
          >
            {activeExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>

          <div style={s.card}>
            <div style={s.sectionLabel}>Max Weight Over Time</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={activeStrengthData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: '#555' }} />
                <CartesianGrid stroke="#252540" />
                <Tooltip {...tooltipStyle()} formatter={v => [`${v} lbs`, 'Max Weight']} />
                <Line type="monotone" dataKey="max_weight_lbs" stroke="var(--accent)" dot={{ r: 3, fill: 'var(--accent)' }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.sectionLabel}>Personal Records</div>
            {activePrs.length === 0 && (
              <div style={{ color: '#555', fontSize: 13 }}>No lifts logged yet</div>
            )}
            {activePrs.map(pr => (
              <div key={pr.exercise_id} style={s.prRow}>
                <div style={s.prName}>{pr.exercise_name}</div>
                <div style={s.prWeight}>{Number(pr.max_weight_lbs)} lbs</div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'health' && (
        <>
          <div style={s.filterRow}>
            {FILTERS.map(f => (
              <button key={f} style={s.filterBtn(activeHealthFilter === f)} onClick={() => setActiveHealthFilter(f)}>{f}</button>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.sectionLabel}>Pain & Energy</div>
            {activeHealthData.length === 0 ? (
              <div style={{ color: '#555', fontSize: 13 }}>No wellness logs yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={activeHealthData}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickFormatter={d => d?.slice(5)} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#555' }} />
                    <CartesianGrid stroke="#252540" />
                    <Tooltip {...tooltipStyle()} />
                    <Line type="monotone" dataKey="pain_level" stroke="#f7a76c" dot={false} strokeWidth={1.5} name="Pain" />
                    <Line type="monotone" dataKey="energy_level" stroke="var(--accent)" dot={false} strokeWidth={1.5} name="Energy" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={s.legendRow}>
                  <div style={s.legendItem}><div style={s.legendLine('#f7a76c')} />Pain</div>
                  <div style={s.legendItem}><div style={s.legendLine('var(--accent)')} />Energy</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'consistency' && (
        <div style={s.card}>
          {!activeConsistency ? (
            <div style={{ color: '#555', fontSize: 13 }}>No workout data yet</div>
          ) : (
            <div style={s.statRow}>
              <div style={s.statItem}>
                <div style={s.statNum}>{activeConsistency.current_streak}</div>
                <div style={s.statSub}>Current streak</div>
              </div>
              <div style={s.statItem}>
                <div style={s.statNum}>{activeConsistency.longest_streak}</div>
                <div style={s.statSub}>Longest streak</div>
              </div>
              <div style={s.statItem}>
                <div style={s.statNum}>{activeConsistency.total_workouts}</div>
                <div style={s.statSub}>Total workouts</div>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'workouts' && (
        <>
          {activeWorkouts.length === 0 && (
            <div style={{ color: '#555', fontSize: 13, padding: '8px 0' }}>No workouts logged yet</div>
          )}
          {activeWorkouts.map(w => (
            <div key={w.id} style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {new Date(w.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              {w.notes && <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{w.notes}</div>}
              {w.sets && [...new Set(w.sets.map(set => set.exercise_id))].map(exId => {
                const exSets = w.sets.filter(set => set.exercise_id === exId)
                return (
                  <div key={exId}>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{exSets[0].exercise_name}</div>
                    {exSets.map((set, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>
                        Set {set.set_number}: {set.weight_lbs} lbs × {set.reps}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
