import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'

const s = {
  page: { padding: '16px 8px 100px' },
  tabs: { display: 'flex', background: '#1a1a2e', borderRadius: 10, padding: 3, marginBottom: 20 },
  tab: (active) => ({
    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: active ? '#7c6af7' : 'transparent',
    color: active ? '#fff' : '#666'
  }),
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 12 },
  select: { background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: '100%', marginBottom: 14, outline: 'none' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 14 },
  filterBtn: (active) => ({
    padding: '6px 12px', borderRadius: 20, border: `1px solid ${active ? '#7c6af7' : '#333'}`,
    background: active ? '#7c6af722' : 'transparent', color: active ? '#a090ff' : '#666',
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
  const [activeTab, setActiveTab] = useState('strength')
  const [exercises, setExercises] = useState([])
  const [selectedExId, setSelectedExId] = useState('')
  const [strengthData, setStrengthData] = useState([])
  const [prs, setPrs] = useState([])
  const [partnerPrs, setPartnerPrs] = useState([])
  const [showPartnerPrs, setShowPartnerPrs] = useState(false)
  const [healthFilter, setHealthFilter] = useState('30d')
  const [healthData, setHealthData] = useState([])
  const [consistency, setConsistency] = useState(null)

  useEffect(() => {
    api.get('/exercises').then(exs => {
      setExercises(exs)
      if (exs.length) setSelectedExId(String(exs[0].id))
    }).catch(() => {})
    api.get('/stats/prs').then(setPrs).catch(() => {})
    api.get('/partner/stats/prs').then(setPartnerPrs).catch(() => {})
    api.get('/stats/consistency').then(setConsistency).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedExId) return
    api.get(`/stats/strength/${selectedExId}`).then(setStrengthData).catch(() => {})
  }, [selectedExId])

  useEffect(() => {
    if (healthFilter === 'All') {
      api.get('/stats/health').then(setHealthData).catch(() => {})
    } else {
      const days = healthFilter === '7d' ? 7 : healthFilter === '30d' ? 30 : 90
      const start = new Date(); start.setDate(start.getDate() - days)
      api.get(`/stats/health?start=${start.toISOString().split('T')[0]}`).then(setHealthData).catch(() => {})
    }
  }, [healthFilter])

  return (
    <div style={s.page}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 }}>Stats</div>

      <div style={s.tabs}>
        {['strength', 'health', 'consistency'].map(tab => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'strength' && (
        <>
          <select style={s.select} value={selectedExId} onChange={e => setSelectedExId(e.target.value)}>
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>

          <div style={s.card}>
            <div style={s.sectionLabel}>Max Weight Over Time</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={strengthData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: '#555' }} />
                <CartesianGrid stroke="#252540" />
                <Tooltip {...tooltipStyle()} formatter={v => [`${v} lbs`, 'Max Weight']} />
                <Line type="monotone" dataKey="max_weight_lbs" stroke="#7c6af7" dot={{ r: 3, fill: '#7c6af7' }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.sectionLabel}>Personal Records</div>
            {(prs.length > 0 || partnerPrs.length > 0) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button style={s.filterBtn(!showPartnerPrs)} onClick={() => setShowPartnerPrs(false)}>My PRs</button>
                {partnerPrs.length > 0 && (
                  <button style={s.filterBtn(showPartnerPrs)} onClick={() => setShowPartnerPrs(true)}>Partner PRs</button>
                )}
              </div>
            )}
            {(showPartnerPrs ? partnerPrs : prs).length === 0 && (
              <div style={{ color: '#555', fontSize: 13 }}>No lifts logged yet</div>
            )}
            {(showPartnerPrs ? partnerPrs : prs).map(pr => (
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
              <button key={f} style={s.filterBtn(healthFilter === f)} onClick={() => setHealthFilter(f)}>{f}</button>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.sectionLabel}>Pain & Energy</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={healthData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickFormatter={d => d?.slice(5)} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#555' }} />
                <CartesianGrid stroke="#252540" />
                <Tooltip {...tooltipStyle()} />
                <Line type="monotone" dataKey="pain_level" stroke="#f7a76c" dot={false} strokeWidth={1.5} name="Pain" />
                <Line type="monotone" dataKey="energy_level" stroke="#7c6af7" dot={false} strokeWidth={1.5} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
            <div style={s.legendRow}>
              <div style={s.legendItem}><div style={s.legendLine('#f7a76c')} />Pain</div>
              <div style={s.legendItem}><div style={s.legendLine('#7c6af7')} />Energy</div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'consistency' && consistency && (
        <>
          <div style={s.card}>
            <div style={s.statRow}>
              <div style={s.statItem}>
                <div style={s.statNum}>{consistency.current_streak}</div>
                <div style={s.statSub}>Current streak</div>
              </div>
              <div style={s.statItem}>
                <div style={s.statNum}>{consistency.longest_streak}</div>
                <div style={s.statSub}>Longest streak</div>
              </div>
              <div style={s.statItem}>
                <div style={s.statNum}>{consistency.total_workouts}</div>
                <div style={s.statSub}>Total workouts</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
