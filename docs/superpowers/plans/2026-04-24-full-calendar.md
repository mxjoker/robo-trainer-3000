# Full Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mini dot-grid on the Dashboard with a full month calendar; tapping any day opens a bottom sheet with that day's workout and wellness summary.

**Architecture:** Dashboard owns `currentMonth` and `selectedDate` state, fetches both workouts and wellness for the displayed month in parallel, and passes a `dayMap` lookup to two new pure components: `CalendarGrid` (renders the grid with dots) and `DaySheet` (the bottom-sheet overlay). No backend changes required — both list endpoints already accept `start`/`end` query params.

**Tech Stack:** React 18, Vite, Vitest + @testing-library/react (jsdom), inline styles (matching existing app patterns), react-router-dom `useNavigate`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/src/components/CalendarGrid.jsx` | Create | Pure display — renders 7-col grid, month nav, dots per day |
| `client/src/__tests__/CalendarGrid.test.jsx` | Create | Unit tests for CalendarGrid |
| `client/src/components/DaySheet.jsx` | Create | Bottom sheet overlay — workout + wellness summary, empty state |
| `client/src/__tests__/DaySheet.test.jsx` | Create | Unit tests for DaySheet |
| `client/src/pages/Dashboard.jsx` | Modify | Replace mini-calendar block; add state, fetch, and render new components |
| `client/src/__tests__/Dashboard.test.jsx` | Modify | Update month-name test; add calendar fetch test |

---

## Task 1: CalendarGrid Component

**Files:**
- Create: `client/src/components/CalendarGrid.jsx`
- Create: `client/src/__tests__/CalendarGrid.test.jsx`

- [ ] **Step 1.1: Write the failing tests**

Create `client/src/__tests__/CalendarGrid.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CalendarGrid from '../components/CalendarGrid'

const APRIL_2026 = { year: 2026, month: 3 } // month is 0-indexed

function makeMap(entries = {}) {
  return entries
}

describe('CalendarGrid', () => {
  it('renders the month name and year in the header', () => {
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('renders 30 day cells for April', () => {
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    // Days 1–30
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.queryByText('31')).not.toBeInTheDocument()
  })

  it('shows a workout dot for a day with a workout entry', () => {
    const dayMap = { '2026-04-10': { workout: { id: 1 } } }
    render(
      <CalendarGrid
        dayMap={dayMap}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    expect(screen.getByTestId('workout-dot-2026-04-10')).toBeInTheDocument()
  })

  it('shows a wellness dot for a day with a wellness entry', () => {
    const dayMap = { '2026-04-10': { wellness: { id: 1 } } }
    render(
      <CalendarGrid
        dayMap={dayMap}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    expect(screen.getByTestId('wellness-dot-2026-04-10')).toBeInTheDocument()
  })

  it('calls onDaySelect with the YYYY-MM-DD string when a day cell is clicked', () => {
    const onDaySelect = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={onDaySelect}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('day-cell-2026-04-15'))
    expect(onDaySelect).toHaveBeenCalledWith('2026-04-15')
  })

  it('disables prev and next buttons while loading', () => {
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={true}
      />
    )
    expect(screen.getByTestId('prev-month-btn')).toBeDisabled()
    expect(screen.getByTestId('next-month-btn')).toBeDisabled()
  })

  it('calls onMonthChange with the previous month when prev button clicked', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('prev-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2026, month: 2 })
  })

  it('calls onMonthChange with the next month when next button clicked', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('next-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2026, month: 4 })
  })

  it('wraps year correctly when going prev from January', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={{ year: 2026, month: 0 }}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('prev-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2025, month: 11 })
  })

  it('wraps year correctly when going next from December', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={{ year: 2026, month: 11 }}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('next-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2027, month: 0 })
  })
})
```

- [ ] **Step 1.2: Run the tests to verify they fail**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test -- CalendarGrid
```

Expected: All tests FAIL with `Cannot find module '../components/CalendarGrid'`.

- [ ] **Step 1.3: Create the CalendarGrid component**

Create `client/src/components/CalendarGrid.jsx`:

```jsx
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
          border: isToday ? '1px solid #7c6af7' : '1px solid transparent',
          opacity: isFuture ? 0.4 : 1,
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: 12, color: isToday ? '#a090ff' : '#ccc' }}>{d}</span>
        <div style={{ display: 'flex', gap: 2, marginTop: 2, height: 5 }}>
          {loading ? (
            <div style={{ width: 4, height: 4, background: '#2a2a3a', borderRadius: '50%' }} />
          ) : (
            <>
              {hasWorkout && <div data-testid={`workout-dot-${dateStr}`} style={{ width: 4, height: 4, background: '#4caf50', borderRadius: '50%' }} />}
              {hasWellness && <div data-testid={`wellness-dot-${dateStr}`} style={{ width: 4, height: 4, background: '#a090ff', borderRadius: '50%' }} />}
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
        <span style={{ color: '#7c6af7', fontWeight: 700, fontSize: 13 }}>{MONTH_NAMES[month]} {year}</span>
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
```

- [ ] **Step 1.4: Run tests and confirm they pass**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test -- CalendarGrid
```

Expected: All 8 tests PASS.

- [ ] **Step 1.5: Commit**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000
git add client/src/components/CalendarGrid.jsx client/src/__tests__/CalendarGrid.test.jsx
git commit -m "feat: add CalendarGrid component with tests"
```

---

## Task 2: DaySheet Component

**Files:**
- Create: `client/src/components/DaySheet.jsx`
- Create: `client/src/__tests__/DaySheet.test.jsx`

- [ ] **Step 2.1: Write the failing tests**

Create `client/src/__tests__/DaySheet.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DaySheet from '../components/DaySheet'

const workout = {
  id: 1,
  notes: 'Push Day',
  duration_minutes: 45,
  sets: [
    { exercise_name: 'Bench Press' },
    { exercise_name: 'OHP' },
    { exercise_name: 'Bench Press' }, // duplicate — should be deduplicated
  ]
}

const wellness = {
  id: 1,
  energy_level: 8,
  mood: 7,
  pain_level: 2,
  sleep_hours: 7.5,
  water_oz: 80,
  creatine_taken: true,
}

describe('DaySheet', () => {
  it('renders nothing when date is null', () => {
    const { container } = render(
      <DaySheet date={null} data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the formatted date', () => {
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('Tue, Apr 21')).toBeInTheDocument()
  })

  it('shows empty state message and log buttons when data is undefined', () => {
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('Nothing logged for this day')).toBeInTheDocument()
    expect(screen.getByText('Log Workout')).toBeInTheDocument()
    expect(screen.getByText('Log Wellness')).toBeInTheDocument()
  })

  it('shows empty state when data has no workout and no wellness', () => {
    render(
      <DaySheet date="2026-04-21" data={{}} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('Nothing logged for this day')).toBeInTheDocument()
  })

  it('calls onLogWorkout when Log Workout button is clicked', () => {
    const onLogWorkout = vi.fn()
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={onLogWorkout} onLogWellness={() => {}} />
    )
    fireEvent.click(screen.getByText('Log Workout'))
    expect(onLogWorkout).toHaveBeenCalledTimes(1)
  })

  it('calls onLogWellness when Log Wellness button is clicked', () => {
    const onLogWellness = vi.fn()
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={onLogWellness} />
    )
    fireEvent.click(screen.getByText('Log Wellness'))
    expect(onLogWellness).toHaveBeenCalledTimes(1)
  })

  it('shows workout name and deduplicated exercise names when workout is present', () => {
    render(
      <DaySheet date="2026-04-21" data={{ workout }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText(/Push Day/)).toBeInTheDocument()
    expect(screen.getByText(/45 min/)).toBeInTheDocument()
    // Bench Press appears once despite being in sets twice
    const bpMatches = screen.getAllByText(/Bench Press/)
    expect(bpMatches.length).toBe(1)
    expect(screen.getByText(/OHP/)).toBeInTheDocument()
  })

  it('shows wellness stats when wellness is present', () => {
    render(
      <DaySheet date="2026-04-21" data={{ wellness }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('8')).toBeInTheDocument()  // energy
    expect(screen.getByText('7')).toBeInTheDocument()  // mood
    expect(screen.getByText('2')).toBeInTheDocument()  // pain
    expect(screen.getByText(/7.5h/)).toBeInTheDocument()
    expect(screen.getByText(/Creatine ✓/)).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={onClose} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    fireEvent.click(screen.getByTestId('day-sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2.2: Run the tests to verify they fail**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test -- DaySheet
```

Expected: All tests FAIL with `Cannot find module '../components/DaySheet'`.

- [ ] **Step 2.3: Create the DaySheet component**

Create `client/src/components/DaySheet.jsx`:

```jsx
function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

export default function DaySheet({ date, data, onClose, onLogWorkout, onLogWellness }) {
  if (!date) return null

  const workout = data?.workout
  const wellness = data?.wellness
  const isEmpty = !workout && !wellness

  const exerciseNames = workout
    ? [...new Set(workout.sets.map(s => s.exercise_name))]
    : []

  return (
    <>
      <div
        data-testid="day-sheet-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
        background: '#12121f', borderRadius: '16px 16px 0 0',
        padding: '12px 16px 40px', maxWidth: 480, margin: '0 auto',
      }}>
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
          {formatDate(date)}
        </div>

        {isEmpty ? (
          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>Nothing logged for this day</div>
            <button
              onClick={onLogWorkout}
              style={{ width: '100%', padding: 12, background: '#4caf5022', border: '1px solid #4caf50', borderRadius: 10, color: '#4caf50', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}
            >Log Workout</button>
            <button
              onClick={onLogWellness}
              style={{ width: '100%', padding: 12, background: '#7c6af722', border: '1px solid #7c6af7', borderRadius: 10, color: '#a090ff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >Log Wellness</button>
          </div>
        ) : (
          <>
            {workout && (
              <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ color: '#4caf50', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  💪 {workout.notes || 'Workout'}
                  {workout.duration_minutes != null && (
                    <span style={{ color: '#555', fontWeight: 400, fontSize: 11 }}> · {workout.duration_minutes} min</span>
                  )}
                </div>
                {exerciseNames.length > 0 && (
                  <div style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>
                    {exerciseNames.join(' · ')}
                  </div>
                )}
              </div>
            )}
            {wellness && (
              <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#a090ff', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🌿 Wellness</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[
                    ['Energy', wellness.energy_level, '#7c6af7'],
                    ['Mood', wellness.mood, '#4caf50'],
                    ['Pain', wellness.pain_level, '#f7a76c'],
                  ].map(([label, value, color]) => value != null && (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                  {wellness.sleep_hours != null && <span>Sleep {wellness.sleep_hours}h · </span>}
                  <span>Water {wellness.water_oz > 0 ? '✓' : '✗'} · </span>
                  <span>Creatine {wellness.creatine_taken ? '✓' : '✗'}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2.4: Run tests and confirm they pass**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test -- DaySheet
```

Expected: All 9 tests PASS.

- [ ] **Step 2.5: Commit**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000
git add client/src/components/DaySheet.jsx client/src/__tests__/DaySheet.test.jsx
git commit -m "feat: add DaySheet bottom-sheet component with tests"
```

---

## Task 3: Wire Everything into Dashboard

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`
- Modify: `client/src/__tests__/Dashboard.test.jsx`

- [ ] **Step 3.1: Update Dashboard.test.jsx**

The existing test `'renders the day name and current month name'` checks for the exact text `'April'` via `screen.getAllByText(monthName)`. After our change the StatCard title becomes `'April 2026'`, so update that assertion. Also add a new test for the calendar data fetch.

Open `client/src/__tests__/Dashboard.test.jsx` and make these two changes:

**Change 1** — Update the month-name assertion (around line 58):

```js
// BEFORE:
await waitFor(() => {
  expect(screen.getByText(dayName)).toBeInTheDocument()
  // Month name appears in the consistency StatCard title
  expect(screen.getAllByText(monthName).length).toBeGreaterThan(0)
})

// AFTER:
await waitFor(() => {
  expect(screen.getByText(dayName)).toBeInTheDocument()
  // StatCard title is now "April 2026"
  const now = new Date()
  expect(screen.getByText(`${monthName} ${now.getFullYear()}`)).toBeInTheDocument()
})
```

**Change 2** — Add a new test at the end of the `describe` block (before the closing `}`):

```js
it('fetches calendar data for the current month and renders workout dot', async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const todayDate = now.toISOString().split('T')[0]

  api.get.mockImplementation((path) => {
    if (path.startsWith('/workouts?')) {
      return Promise.resolve([{
        id: 1,
        date: todayDate,
        notes: 'Leg day',
        duration_minutes: 60,
        sets: [{ exercise_name: 'Squat' }]
      }])
    }
    if (path.startsWith('/wellness?')) {
      return Promise.resolve([])
    }
    return Promise.reject(new Error('not found'))
  })

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByTestId(`workout-dot-${todayDate}`)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3.2: Run the updated Dashboard tests to verify the new test fails and existing tests still pass**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test -- Dashboard
```

Expected: The new `'fetches calendar data'` test FAILS (CalendarGrid not yet in Dashboard). The updated month-name test also FAILS. All other existing Dashboard tests PASS.

- [ ] **Step 3.3: Rewrite Dashboard.jsx**

Replace `client/src/pages/Dashboard.jsx` with the following:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import SparkBar from '../components/SparkBar'
import DualLineChart from '../components/DualLineChart'
import CalendarGrid from '../components/CalendarGrid'
import DaySheet from '../components/DaySheet'

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

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const now = new Date()
  const dayName = DAYS[now.getDay()]
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}`

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

  function thirtyDaysAgo() {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }

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
        date={selectedDate}
        data={selectedDate ? dayMap[selectedDate] : undefined}
        onClose={() => setSelectedDate(null)}
        onLogWorkout={() => { setSelectedDate(null); navigate('/log/workout') }}
        onLogWellness={() => { setSelectedDate(null); navigate('/log/wellness') }}
      />
    </div>
  )
}
```

- [ ] **Step 3.4: Run all Dashboard tests and confirm they pass**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test -- Dashboard
```

Expected: All Dashboard tests PASS (including the updated month-name test and the new calendar fetch test).

- [ ] **Step 3.5: Run the full test suite to check for regressions**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm test
```

Expected: All tests PASS. Zero failures.

- [ ] **Step 3.6: Commit**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000
git add client/src/pages/Dashboard.jsx client/src/__tests__/Dashboard.test.jsx
git commit -m "feat: wire CalendarGrid and DaySheet into Dashboard"
```

---

## Task 4: Manual Smoke Test

- [ ] **Step 4.1: Start dev server**

```bash
# Terminal 1 — backend
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/server && node server.js

# Terminal 2 — frontend
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000/client && npm run dev
```

Open http://localhost:5173 and log in.

- [ ] **Step 4.2: Verify calendar renders**

- Dashboard shows a full month grid (not the old dot-row)
- Month name + year appears in the card header
- Prev / next arrows are visible
- Days with logged workouts show a green dot below the number
- Days with logged wellness show a purple dot

- [ ] **Step 4.3: Verify day sheet**

- Tap a day with a workout → bottom sheet slides up, shows workout name and exercise names
- Tap a day with wellness → wellness section shows energy / mood / pain numbers
- Tap a day with no data → empty state with "Log Workout" and "Log Wellness" buttons
- Tap "Log Workout" → sheet closes, navigates to workout logger
- Tap backdrop → sheet closes

- [ ] **Step 4.4: Verify month navigation**

- Tap ‹ → previous month loads, dots update
- Tap › → next month loads, dots update
- While loading, arrows are disabled (briefly)

- [ ] **Step 4.5: Final commit and push**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000
git push
```
