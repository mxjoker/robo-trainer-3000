const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['S','M','T','W','T','F','S']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function CalendarGrid({ dayMap, currentMonth, onDaySelect, onMonthChange, loading }) {
  const { year, month } = currentMonth
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = todayStr()

  function prevMonth() {
    if (month === 0) onMonthChange({ year: year - 1, month: 11 })
    else onMonthChange({ year, month: month - 1 })
  }

  function nextMonth() {
    if (month === 11) onMonthChange({ year: year + 1, month: 0 })
    else onMonthChange({ year, month: month + 1 })
  }

  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d)
    const entry = dayMap[dateStr]
    const isToday = dateStr === today
    const isFuture = dateStr > today
    const hasWorkout = !loading && entry?.workout != null
    const hasWellness = !loading && entry?.wellness != null

    cells.push(
      <div
        key={dateStr}
        data-testid={`day-cell-${dateStr}`}
        onClick={() => onDaySelect(dateStr)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '4px 2px',
          borderRadius: 6,
          border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
          opacity: isFuture ? 0.4 : 1,
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: 12, color: isToday ? 'var(--accent-dim)' : '#ccc' }}>{d}</span>
        <div style={{ display: 'flex', gap: 2, marginTop: 2, height: 5 }}>
          {loading ? (
            <div style={{ width: 4, height: 4, background: '#2a2a3a', borderRadius: '50%' }} />
          ) : (
            <>
              {hasWorkout && <div data-testid={`workout-dot-${dateStr}`} style={{ width: 4, height: 4, background: '#4caf50', borderRadius: '50%' }} />}
              {hasWellness && <div data-testid={`wellness-dot-${dateStr}`} style={{ width: 4, height: 4, background: 'var(--accent-dim)', borderRadius: '50%' }} />}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button
          data-testid="prev-month-btn"
          onClick={prevMonth}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: loading ? '#333' : '#888', fontSize: 20, cursor: loading ? 'default' : 'pointer', padding: '0 8px' }}
        >‹</button>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{MONTH_NAMES[month]} {year}</span>
        <button
          data-testid="next-month-btn"
          onClick={nextMonth}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: loading ? '#333' : '#888', fontSize: 20, cursor: loading ? 'default' : 'pointer', padding: '0 8px' }}
        >›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAY_HEADERS.map((h, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#555', paddingBottom: 4 }}>{h}</div>
        ))}
        {cells}
      </div>
    </div>
  )
}
