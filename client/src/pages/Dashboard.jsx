import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import SparkBar from '../components/SparkBar'
import DualLineChart from '../components/DualLineChart'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  dayLabel: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  dateLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  streakNum: { fontSize: 22, fontWeight: 700, textAlign: 'right' },
  streakSub: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555' },
  todayRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  todayCell: { background: '#1a1a2e', borderRadius: 8, padding: 10 },
  cellLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 3 },
  cellValue: (color) => ({ fontSize: 18, fontWeight: 700, color }),
  cellSub: { fontSize: 11, color: '#888' },
  prCallout: { fontSize: 12, fontWeight: 600, color: '#4caf8a', marginTop: 6 },
  legendRow: { display: 'flex', gap: 14, marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#666' },
  legendLine: (color) => ({ width: 12, height: 2, background: color, borderRadius: 1 }),
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 8 },
  calDot: (type) => ({
    aspectRatio: '1', borderRadius: 3,
    background: type === 'workout' ? '#4caf8a' : type === 'rest' ? '#f7a76c' : '#1f1f30',
    opacity: type === 'workout' ? 0.8 : type === 'rest' ? 0.6 : 1
  }),
  partnerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  partnerMeta: { fontSize: 10, color: '#555', marginTop: 3 }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [consistency, setConsistency] = useState(null)
  const [healthData, setHealthData] = useState([])
  const [todayWellness, setTodayWellness] = useState(null)
  const [prs, setPrs] = useState([])
  const [strengthHistory, setStrengthHistory] = useState([])
  const [topExercise, setTopExercise] = useState(null)
  const [partnerData, setPartnerData] = useState(null)

  const now = new Date()
  const dayName = DAYS[now.getDay()]
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}`

  useEffect(() => {
    api.get('/stats/consistency').then(setConsistency).catch(() => {})
    api.get('/stats/health?start=' + thirtyDaysAgo()).then(data => setHealthData(data.slice(-30))).catch(() => {})
    api.get('/wellness/today').then(setTodayWellness).catch(() => {})
    api.get('/stats/prs').then(prs => {
      setPrs(prs)
      if (prs.length > 0) {
        const topPR = prs.reduce((a, b) => Number(b.max_weight_lbs) > Number(a.max_weight_lbs) ? b : a)
        setTopExercise(topPR)
        api.get(`/stats/strength/${topPR.exercise_id}`).then(h => setStrengthHistory(h.slice(-7))).catch(() => {})
      }
    }).catch(() => {})
    api.get('/partner/profile').then(profile => {
      Promise.all([
        api.get('/partner/workouts'),
        api.get('/partner/wellness')
      ]).then(([workouts, wellness]) => {
        setPartnerData({ profile, recentWorkout: workouts[0] || null, recentWellness: wellness[0] || null })
      })
    }).catch(() => {})
  }, [])

  function thirtyDaysAgo() {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }

  // Build calendar dots for current month
  const workoutDateSet = new Set(consistency?.workout_dates || [])
  const calDots = []
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dotDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const isToday = d === now.getDate()
    calDots.push(workoutDateSet.has(dotDateStr) ? 'workout' : isToday ? 'today' : d < now.getDate() ? 'rest' : 'future')
  }

  const sparkData = strengthHistory.map(h => ({ value: h.max_weight_lbs, label: h.date }))
  const topPR = topExercise ? Number(topExercise.max_weight_lbs) : null

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.dayLabel}>{dayName}</div>
          <div style={s.dateLabel}>{dateStr}</div>
        </div>
        <div>
          <div style={s.streakNum}>{consistency?.current_streak ?? '—'}</div>
          <div style={s.streakSub}>Day streak</div>
        </div>
      </div>

      {/* Today's status */}
      <div style={s.todayRow}>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Workout</div>
          {workoutDateSet.has(new Date().toISOString().split('T')[0])
            ? <div style={s.cellValue('#4caf8a')}>Done</div>
            : <div style={s.cellValue('#555')}>—</div>}
        </div>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Pain</div>
          <div style={s.cellValue('#f7a76c')}>
            {todayWellness?.pain_level ?? '—'}
            {todayWellness && <span style={{ fontSize: 10, color: '#555', fontWeight: 400 }}> /10</span>}
          </div>
        </div>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Energy</div>
          <div style={s.cellValue('#7c6af7')}>
            {todayWellness?.energy_level ?? '—'}
            {todayWellness && <span style={{ fontSize: 10, color: '#555', fontWeight: 400 }}> /10</span>}
          </div>
        </div>
      </div>

      {/* Strength card */}
      <StatCard title="Strength" linkLabel="All lifts" onLink={() => navigate('/stats')}>
        <SparkBar data={sparkData} />
        {topExercise && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 10, color: '#666' }}>{topExercise.exercise_name}</div>
            {topPR && <div style={s.prCallout}>{topPR} lbs — PR</div>}
          </div>
        )}
      </StatCard>

      {/* Health trends */}
      <StatCard title="Health Trends" linkLabel="Details" onLink={() => navigate('/stats')}>
        <DualLineChart data={healthData} />
        <div style={s.legendRow}>
          <div style={s.legendItem}><div style={s.legendLine('#f7a76c')} />Pain</div>
          <div style={s.legendItem}><div style={s.legendLine('#7c6af7')} />Energy</div>
        </div>
      </StatCard>

      {/* Consistency */}
      <StatCard title={MONTHS[now.getMonth()]} linkLabel="Calendar" onLink={() => navigate('/stats')}>
        <div style={s.calGrid}>
          {calDots.map((type, i) => <div key={i} style={s.calDot(type)} />)}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['#4caf8a', 'Workout'], ['#f7a76c', 'Rest']].map(([color, label]) => (
            <div key={label} style={s.legendItem}>
              <div style={{ width: 8, height: 8, background: color, borderRadius: 2, opacity: 0.8 }} />
              {label}
            </div>
          ))}
        </div>
      </StatCard>

      {/* Partner card */}
      {partnerData && (
        <StatCard title={partnerData.profile.name} linkLabel="View" onLink={() => navigate('/partner')}>
          {partnerData.recentWorkout
            ? <div style={s.partnerSub}>{partnerData.recentWorkout.notes || 'Workout logged'}</div>
            : <div style={s.partnerSub}>No recent activity</div>}
          {partnerData.recentWellness && (
            <div style={s.partnerMeta}>
              Pain {partnerData.recentWellness.pain_level} · Energy {partnerData.recentWellness.energy_level}
            </div>
          )}
        </StatCard>
      )}
    </div>
  )
}
