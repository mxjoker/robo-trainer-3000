import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import SparkBar from '../components/SparkBar'
import DualLineChart from '../components/DualLineChart'
import CalendarGrid from '../components/CalendarGrid'
import DaySheet from '../components/DaySheet'

const s = {
  page: { padding: '16px 8px 100px', display: 'flex', flexDirection: 'column', gap: 12 },
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
  partnerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  partnerMeta: { fontSize: 10, color: '#555', marginTop: 3 },
  calError: { fontSize: 12, color: '#f7a76c', display: 'flex', alignItems: 'center', gap: 8 },
  retryBtn: { background: 'none', border: '1px solid #f7a76c', borderRadius: 6, color: '#f7a76c', fontSize: 11, padding: '3px 8px', cursor: 'pointer' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthRange(year, month) {
  const mm = String(month + 1).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

function buildDayMap(workouts, wellnessList) {
  const map = {}
  for (const w of workouts) {
    const key = w.date.split('T')[0]
    map[key] = { ...map[key], workout: w }
  }
  for (const wl of wellnessList) {
    const key = wl.date.split('T')[0]
    map[key] = { ...map[key], wellness: wl }
  }
  return map
}

function thirtyDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const now = new Date()
  const dayName = DAYS[now.getDay()]
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}`

  const [activeWorkoutId] = useState(() => localStorage.getItem('rt_active_workout_id'))

  // Stats + partner state
  const [consistency, setConsistency] = useState(null)
  const [healthData, setHealthData] = useState([])
  const [todayWellness, setTodayWellness] = useState(null)
  const [prs, setPrs] = useState([])
  const [strengthHistory, setStrengthHistory] = useState([])
  const [topExercise, setTopExercise] = useState(null)
  const [partnerData, setPartnerData] = useState(null)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  // Open DaySheet for a date passed via navigation state (e.g. from Photos gallery)
  useEffect(() => {
    if (location.state?.selectedDate) setSelectedDate(location.state.selectedDate)
  }, [])
  const [dayMap, setDayMap] = useState({})
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  // Stats + partner fetch (unchanged)
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
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  // Calendar fetch — re-runs whenever currentMonth changes
  useEffect(() => {
    const { start, end } = monthRange(currentMonth.year, currentMonth.month)
    setCalLoading(true)
    setCalError(null)
    Promise.all([
      api.get(`/workouts?start=${start}&end=${end}`),
      api.get(`/wellness?start=${start}&end=${end}`),
    ])
      .then(([workouts, wellnessList]) => setDayMap(buildDayMap(workouts, wellnessList)))
      .catch(() => setCalError('Failed to load calendar data'))
      .finally(() => setCalLoading(false))
  }, [currentMonth])

  const workoutDateSet = new Set(consistency?.workout_dates || [])
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

      {/* Resume workout banner */}
      {activeWorkoutId && (
        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-dim)' }}>Workout in progress</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>You have an unfinished workout</div>
          </div>
          <button
            style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/log/workout', { state: { resumeWorkoutId: Number(activeWorkoutId) } })}
          >Resume Workout</button>
        </div>
      )}

      {/* Today's status */}
      <div style={s.todayRow}>
        <div style={s.todayCell}>
          <div style={s.cellLabel}>Workout</div>
          {workoutDateSet.has(now.toISOString().split('T')[0])
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
          <div style={s.cellValue('var(--accent)')}>
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
          <div style={s.legendItem}><div style={s.legendLine('var(--accent)')} />Energy</div>
        </div>
      </StatCard>

      {/* Full calendar */}
      <StatCard title={`${MONTHS[currentMonth.month]} ${currentMonth.year}`}>
        {calError ? (
          <div style={s.calError}>
            {calError}
            <button style={s.retryBtn} onClick={() => setCurrentMonth({ ...currentMonth })}>Retry</button>
          </div>
        ) : (
          <CalendarGrid
            dayMap={dayMap}
            currentMonth={currentMonth}
            onDaySelect={setSelectedDate}
            onMonthChange={setCurrentMonth}
            loading={calLoading}
          />
        )}
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

      {/* Day detail sheet */}
      <DaySheet
        key={selectedDate}
        date={selectedDate}
        data={selectedDate ? dayMap[selectedDate] : undefined}
        onClose={() => setSelectedDate(null)}
        onLogWorkout={() => { setSelectedDate(null); navigate('/log/workout') }}
        onLogWellness={() => { setSelectedDate(null); navigate('/log/wellness') }}
        onEditWorkout={id => {
          setSelectedDate(null)
          navigate('/log/workout', { state: { resumeWorkoutId: id } })
        }}
        onWorkoutDelete={workoutId => {
          setDayMap(prev => {
            const next = { ...prev }
            for (const key of Object.keys(next)) {
              if (next[key]?.workout?.id === workoutId) {
                next[key] = { ...next[key], workout: undefined }
              }
            }
            return next
          })
          setSelectedDate(null)
        }}
        onPhotoChange={(workoutId, photoUrl) => {
          setDayMap(prev => {
            const newMap = { ...prev }
            for (const key of Object.keys(newMap)) {
              if (newMap[key].workout?.id === workoutId) {
                newMap[key] = { ...newMap[key], workout: { ...newMap[key].workout, photo_url: photoUrl } }
              }
            }
            return newMap
          })
        }}
      />
    </div>
  )
}
