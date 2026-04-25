# Mobility & Stretching Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible Mobility & Stretching section to the WorkoutLogger that lets users log exercises with a duration, stored in a new `mobility_sets` table and surfaced in the DaySheet calendar view.

**Architecture:** New `mobility_sets` table linked to workouts. Backend adds POST/DELETE mobility routes and extends `GET /api/workouts/:id` to include `mobility_sets`. WorkoutLogger gets a collapsed bottom section with an exercise picker + seconds input. DaySheet shows a teal mobility line if `workout.mobility_sets` has entries.

**Tech Stack:** Node.js/Express/PostgreSQL (backend), React 18 inline-styles (frontend), Vitest + @testing-library/react (tests in `client/src/__tests__/`)

---

## File Map

| File | Change |
|---|---|
| `server/db/migrations/004_add_mobility.sql` | Create — new `mobility_sets` table |
| `server/db/migrate4.js` | Create — migration runner script |
| `server/routes/workouts.js` | Modify — extend `getWorkoutWithSets`, add POST/DELETE mobility routes |
| `client/src/components/DaySheet.jsx` | Modify — show mobility exercises in workout card |
| `client/src/__tests__/DaySheet.test.jsx` | Modify — add test for mobility display |
| `client/src/screens/WorkoutLogger.jsx` | Modify — add collapsed mobility section |
| `client/src/__tests__/WorkoutLogger.test.jsx` | Create — new test file for mobility section |

---

## Task 1: DB Migration — `mobility_sets` table

**Files:**
- Create: `server/db/migrations/004_add_mobility.sql`
- Create: `server/db/migrate4.js`

- [ ] **Step 1: Write the migration SQL**

Create `server/db/migrations/004_add_mobility.sql`:

```sql
CREATE TABLE IF NOT EXISTS mobility_sets (
  id               SERIAL PRIMARY KEY,
  workout_id       INTEGER REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id      INTEGER REFERENCES exercises(id) ON DELETE RESTRICT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobility_sets_workout_id ON mobility_sets(workout_id);
```

- [ ] **Step 2: Write the migration runner**

Create `server/db/migrate4.js`:

```js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '004_add_mobility.sql'),
    'utf8'
  )

  const dbs = [
    process.env.DATABASE_URL,
    process.env.TEST_DATABASE_URL,
  ].filter(Boolean)

  for (const connectionString of dbs) {
    const pool = new Pool({ connectionString })
    try {
      await pool.query(sql)
      console.log(`Migration complete on: ${connectionString}`)
    } finally {
      await pool.end()
    }
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 3: Run the migration against the Neon DB**

From the repo root:

```bash
DATABASE_URL="postgresql://neondb_owner:npg_Xo9p3LUyDkKW@ep-square-dream-amnzu53a-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" node server/db/migrate4.js
```

Expected output:
```
Migration complete on: postgresql://neondb_owner:...
```

- [ ] **Step 4: Commit**

```bash
git add server/db/migrations/004_add_mobility.sql server/db/migrate4.js
git commit -m "feat: add mobility_sets migration"
```

---

## Task 2: Backend — mobility routes + extend GET /:id

**Files:**
- Modify: `server/routes/workouts.js`

The current `getWorkoutWithSets` helper (lines 8–18) only fetches `sets`. Extend it to also fetch `mobility_sets` with exercise names. Then add `POST /:id/mobility` and `DELETE /:id/mobility/:setId` routes.

- [ ] **Step 1: Extend `getWorkoutWithSets` to include mobility sets**

Replace the existing `getWorkoutWithSets` function (lines 8–18) with:

```js
async function getWorkoutWithSets(workoutId) {
  const workout = (await pool.query('SELECT * FROM workouts WHERE id = $1', [workoutId])).rows[0]
  if (!workout) return null
  const sets = (await pool.query(
    `SELECT s.*, e.name as exercise_name, e.muscle_group
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_id = $1 ORDER BY s.set_number`,
    [workoutId]
  )).rows
  const mobilitySets = (await pool.query(
    `SELECT ms.*, e.name as exercise_name
     FROM mobility_sets ms JOIN exercises e ON e.id = ms.exercise_id
     WHERE ms.workout_id = $1 ORDER BY ms.sort_order`,
    [workoutId]
  )).rows
  return { ...workout, sets, mobility_sets: mobilitySets }
}
```

- [ ] **Step 2: Add `POST /:id/mobility` route**

Add this block after the `POST /:id/sets` route (after line 75), before `PUT /sets/:id`:

```js
// POST /api/workouts/:id/mobility
router.post('/:id/mobility', async (req, res) => {
  try {
    const { exercise_id, duration_seconds, sort_order = 0 } = req.body
    if (!exercise_id || duration_seconds == null) {
      return res.status(400).json({ error: 'exercise_id and duration_seconds are required' })
    }
    const workout = (await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    )).rows[0]
    if (!workout) return res.status(404).json({ error: 'Workout not found' })
    const result = await pool.query(
      `INSERT INTO mobility_sets (workout_id, exercise_id, sort_order, duration_seconds)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [workout.id, exercise_id, sort_order, duration_seconds]
    )
    const ex = (await pool.query('SELECT name FROM exercises WHERE id = $1', [exercise_id])).rows[0]
    res.status(201).json({ ...result.rows[0], exercise_name: ex?.name })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
```

- [ ] **Step 3: Add `DELETE /:id/mobility/:setId` route**

Add this block after `DELETE /sets/:id` (after line 118), before `GET /:id`:

```js
// DELETE /api/workouts/:id/mobility/:setId
router.delete('/:id/mobility/:setId', async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT ms.id FROM mobility_sets ms
       JOIN workouts w ON w.id = ms.workout_id
       WHERE ms.id = $1 AND w.user_id = $2`,
      [req.params.setId, req.user.id]
    )
    if (!check.rows[0]) return res.status(404).json({ error: 'Mobility set not found' })
    await pool.query('DELETE FROM mobility_sets WHERE id = $1', [req.params.setId])
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
```

- [ ] **Step 4: Verify the server starts without errors**

```bash
cd server && node -e "require('./app')" && echo "OK"
```

Expected: `OK` (no errors thrown on require)

- [ ] **Step 5: Commit**

```bash
git add server/routes/workouts.js
git commit -m "feat: add mobility routes and extend GET /workouts/:id"
```

---

## Task 3: DaySheet — show mobility exercises in workout card

**Files:**
- Modify: `client/src/components/DaySheet.jsx`
- Modify: `client/src/__tests__/DaySheet.test.jsx`

The current workout card shows exercise names from `sets`. Add a teal line below when `workout.mobility_sets` has entries.

- [ ] **Step 1: Write the failing test**

Add this test to `client/src/__tests__/DaySheet.test.jsx`, after the last existing test:

```jsx
it('shows mobility exercises in workout card when present', () => {
  const workoutWithMobility = {
    id: 1,
    notes: 'Push Day',
    duration_minutes: 45,
    sets: [{ exercise_name: 'Bench Press' }],
    mobility_sets: [
      { id: 1, exercise_name: 'Hip Flexor Stretch', duration_seconds: 45 },
      { id: 2, exercise_name: 'Pigeon Pose', duration_seconds: 60 },
    ]
  }
  render(
    <DaySheet date="2026-04-21" data={{ workout: workoutWithMobility }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
  )
  expect(screen.getByText(/Hip Flexor Stretch/)).toBeInTheDocument()
  expect(screen.getByText(/Pigeon Pose/)).toBeInTheDocument()
})

it('does not show mobility line when mobility_sets is empty', () => {
  const workoutNoMobility = {
    id: 1,
    notes: 'Push Day',
    duration_minutes: 45,
    sets: [{ exercise_name: 'Bench Press' }],
    mobility_sets: []
  }
  render(
    <DaySheet date="2026-04-21" data={{ workout: workoutNoMobility }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
  )
  expect(screen.queryByText(/Mobility:/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -E "DaySheet|PASS|FAIL|✓|✗|×"
```

Expected: 2 new tests fail ("Unable to find element" or similar).

- [ ] **Step 3: Add the mobility line to DaySheet.jsx**

In `client/src/components/DaySheet.jsx`, find the workout card block. After the `exerciseNames` div (currently lines 55–59), add:

```jsx
{workout.mobility_sets?.length > 0 && (
  <div style={{ color: '#4db6f7', fontSize: 12, marginTop: 4 }}>
    Mobility: {workout.mobility_sets.map(ms => ms.exercise_name).join(' · ')}
  </div>
)}
```

The full updated workout card inner block should look like:

```jsx
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
    {workout.mobility_sets?.length > 0 && (
      <div style={{ color: '#4db6f7', fontSize: 12, marginTop: 4 }}>
        Mobility: {workout.mobility_sets.map(ms => ms.exercise_name).join(' · ')}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -E "DaySheet|PASS|FAIL|✓|✗|×"
```

Expected: all DaySheet tests pass including the 2 new ones.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/DaySheet.jsx client/src/__tests__/DaySheet.test.jsx
git commit -m "feat: show mobility exercises in DaySheet workout card"
```

---

## Task 4: WorkoutLogger — collapsed mobility section

**Files:**
- Modify: `client/src/screens/WorkoutLogger.jsx`
- Create: `client/src/__tests__/WorkoutLogger.test.jsx`

Add 4 new state variables, 3 new functions, and a mobility section between the exercise picker and the Finish Workout button.

- [ ] **Step 1: Write the failing tests**

Create `client/src/__tests__/WorkoutLogger.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorkoutLogger from '../screens/WorkoutLogger'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
}))

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  }
}))

import { api } from '../api/client'

const exercises = [
  { id: 1, name: 'Clamshell', muscle_group: 'glutes' },
  { id: 2, name: 'Bird Dog', muscle_group: 'core' },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockResolvedValue(exercises)
  api.post.mockResolvedValue({ id: 5, sets: [], mobility_sets: [] })
})

describe('WorkoutLogger — mobility section', () => {
  it('shows collapsed mobility button by default', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))
    expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument()
    expect(screen.queryByText('Mobility & Stretching')).not.toBeInTheDocument()
  })

  it('expands mobility section when button is clicked', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))
    expect(screen.getByText('Mobility & Stretching')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mobility exercise' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Duration in seconds' })).toBeInTheDocument()
  })

  it('adds a mobility exercise and shows it in the list', async () => {
    api.post
      .mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] })
      .mockResolvedValueOnce({ id: 10, exercise_id: 1, exercise_name: 'Clamshell', duration_seconds: 30 })

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))

    fireEvent.change(screen.getByRole('combobox', { name: 'Mobility exercise' }), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Duration in seconds' }), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('add-mobility-btn'))

    await waitFor(() => expect(screen.getByText('Clamshell')).toBeInTheDocument())
    expect(screen.getByText(/30s/)).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/workouts/5/mobility', {
      exercise_id: 1,
      duration_seconds: 30,
      sort_order: 0,
    })
  })

  it('removes a mobility exercise when × is clicked', async () => {
    api.post
      .mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] })
      .mockResolvedValueOnce({ id: 10, exercise_id: 1, exercise_name: 'Clamshell', duration_seconds: 30 })
    api.delete.mockResolvedValue(null)

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))

    fireEvent.change(screen.getByRole('combobox', { name: 'Mobility exercise' }), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Duration in seconds' }), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('add-mobility-btn'))
    await waitFor(() => expect(screen.getByText('Clamshell')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Remove Clamshell' }))
    await waitFor(() => expect(screen.queryByText('Clamshell')).not.toBeInTheDocument())
    expect(api.delete).toHaveBeenCalledWith('/workouts/5/mobility/10')
  })

  it('shows notes textarea when mobility section is expanded', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))
    expect(screen.getByRole('textbox', { name: 'Workout notes' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -E "WorkoutLogger|PASS|FAIL|✓|✗|×"
```

Expected: 5 tests fail (WorkoutLogger module loads but testids/elements not found).

- [ ] **Step 3: Add new state variables and functions to WorkoutLogger.jsx**

In `client/src/screens/WorkoutLogger.jsx`, add these 4 state declarations after the `loggedExercises` state (after line 55):

```jsx
const [mobilityExpanded, setMobilityExpanded] = useState(false)
const [mobilitySets, setMobilitySets] = useState([])
const [mobilityPickerExId, setMobilityPickerExId] = useState('')
const [mobilityDurationInput, setMobilityDurationInput] = useState('')
const [workoutNotes, setWorkoutNotes] = useState('')
```

Add these 3 functions after the `finish` function (after line 146):

```jsx
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
```

- [ ] **Step 4: Add the mobility section to the JSX**

In the `return` block of WorkoutLogger, find the `Finish Workout` button (currently line 244):

```jsx
<button style={s.finishBtn} onClick={finish} disabled={saving}>
```

Insert the following block **immediately before** that button:

```jsx
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
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -E "WorkoutLogger|DaySheet|PASS|FAIL|✓|✗|×"
```

Expected: all 5 WorkoutLogger tests pass, all DaySheet tests still pass.

- [ ] **Step 6: Run full test suite to check for regressions**

```bash
cd client && npm test 2>&1 | tail -5
```

Expected: all tests pass (should be 125+ tests, 0 failures).

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/WorkoutLogger.jsx client/src/__tests__/WorkoutLogger.test.jsx
git commit -m "feat: add mobility section to workout logger"
```
