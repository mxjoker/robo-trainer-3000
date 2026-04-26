# Claude Personal Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Claude read a user's workout stats via a public URL and generate a workout template the app can import to pre-fill the WorkoutLogger.

**Architecture:** A new unauthenticated Express route returns plaintext stats (workouts, PRs, wellness). A pure parser function converts Claude's template format into exercise+set data. WorkoutLogger gains an import banner (visible until first exercise added) that opens a paste modal. Settings gains a section showing the user's stats URL.

**Tech Stack:** Express + pg (server), React 18 inline styles, Vitest + @testing-library/react (client), supertest (server tests)

---

## File Map

| Path | Status | Responsibility |
|---|---|---|
| `server/routes/public.js` | Create | Unauthenticated stats endpoint |
| `server/app.js` | Modify | Mount `/api/public` routes |
| `client/src/utils/parseClaudeTemplate.js` | Create | Pure parser for Claude template text |
| `client/src/__tests__/parseClaudeTemplate.test.js` | Create | Unit tests for parser |
| `client/src/screens/WorkoutLogger.jsx` | Modify | Import banner, paste modal, handleImport |
| `client/src/__tests__/WorkoutLogger.test.jsx` | Modify | Add import banner/modal tests |
| `client/src/pages/Settings.jsx` | Modify | Stats URL section with copy button |
| `client/src/__tests__/Settings.test.jsx` | Create | Stats URL display and copy button test |
| `server/__tests__/public.test.js` | Create | Integration tests for public endpoint |

---

## Task 1: Public stats endpoint

**Files:**
- Create: `server/routes/public.js`
- Modify: `server/app.js`
- Test: `server/__tests__/public.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/public.test.js`:

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let userId, token, exerciseId

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  await pool.query(`
    INSERT INTO exercises (name, muscle_group)
    VALUES ('Bench Press', 'chest')
    ON CONFLICT DO NOTHING
  `)
  const data = await createUser({ name: 'Joe', email: 'joe@test.com' })
  token = data.token
  const userRow = await pool.query("SELECT id FROM users WHERE email = 'joe@test.com'")
  userId = userRow.rows[0].id
  const exRow = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = exRow.rows[0].id
})

afterAll(() => pool.end())

describe('GET /api/public/user/:userId', () => {
  it('returns 404 for an unknown userId', async () => {
    const res = await request(app).get('/api/public/user/999999')
    expect(res.status).toBe(404)
    expect(res.text).toContain('User not found')
  })

  it('does not require auth — returns 200 without a token', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.status).toBe(200)
  })

  it('returns text/plain content type', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
  })

  it('includes the user name in the output', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('Robo Trainer Stats for Joe')
  })

  it('includes workout and set data when workouts exist', async () => {
    const w = (await request(app)
      .post('/api/workouts')
      .set(authHeader(token))
      .send({ date: '2026-04-21' })).body
    await request(app)
      .post(`/api/workouts/${w.id}/sets`)
      .set(authHeader(token))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 185, reps: 8 })

    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('RECENT WORKOUTS')
    expect(res.text).toContain('Bench Press')
    expect(res.text).toContain('185 lbs')
  })

  it('includes PR section when weighted sets exist', async () => {
    const w = (await request(app)
      .post('/api/workouts')
      .set(authHeader(token))
      .send({ date: '2026-04-21' })).body
    await request(app)
      .post(`/api/workouts/${w.id}/sets`)
      .set(authHeader(token))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 195, reps: 5 })

    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('PERSONAL RECORDS')
    expect(res.text).toContain('Bench Press: 195 lbs')
  })

  it('omits wellness section when no wellness data', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).not.toContain('WELLNESS')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npm test -- --testPathPattern=public 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../routes/public'` or similar.

- [ ] **Step 3: Create `server/routes/public.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')

const router = express.Router()

// GET /api/public/user/:userId — no auth required
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) return res.status(404).type('text').send('User not found')

    const userRow = (await pool.query('SELECT name FROM users WHERE id = $1', [userId])).rows[0]
    if (!userRow) return res.status(404).type('text').send('User not found')

    // Parallel: recent workouts, PRs, wellness averages
    const [workoutsResult, prsResult, wellnessResult] = await Promise.all([
      pool.query(
        `SELECT id, date, notes FROM workouts WHERE user_id = $1 ORDER BY date DESC, id DESC LIMIT 10`,
        [userId]
      ),
      pool.query(
        `SELECT e.name AS exercise_name, MAX(s.weight_lbs) AS max_weight_lbs
         FROM sets s
         JOIN workouts w ON w.id = s.workout_id
         JOIN exercises e ON e.id = s.exercise_id
         WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL AND s.weight_lbs > 0
         GROUP BY s.exercise_id, e.name
         ORDER BY e.name`,
        [userId]
      ),
      pool.query(
        `SELECT ROUND(AVG(pain_level)::numeric, 1) AS avg_pain,
                ROUND(AVG(energy_level)::numeric, 1) AS avg_energy,
                ROUND(AVG(mood)::numeric, 1) AS avg_mood
         FROM wellness_logs
         WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
        [userId]
      ),
    ])

    // Fetch sets for the recent workouts
    const workoutIds = workoutsResult.rows.map(w => w.id)
    let setsRows = []
    if (workoutIds.length > 0) {
      const setsResult = await pool.query(
        `SELECT s.workout_id, e.name AS exercise_name, s.set_number, s.reps, s.weight_lbs
         FROM sets s JOIN exercises e ON e.id = s.exercise_id
         WHERE s.workout_id = ANY($1)
         ORDER BY s.workout_id, s.exercise_id, s.set_number`,
        [workoutIds]
      )
      setsRows = setsResult.rows
    }

    // Build plaintext output
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const lines = [`Robo Trainer Stats for ${userRow.name}`, `Last updated: ${today}`, '']

    if (workoutsResult.rows.length > 0) {
      lines.push('=== RECENT WORKOUTS ===')
      for (const workout of workoutsResult.rows) {
        const dateStr = workout.date.toString().slice(0, 10)
        const d = new Date(dateStr + 'T12:00:00Z')
        lines.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
        if (workout.notes) lines.push(`  Notes: ${workout.notes}`)
        for (const set of setsRows.filter(s => s.workout_id === workout.id)) {
          const weightPart = set.weight_lbs ? ` @ ${set.weight_lbs} lbs` : ''
          lines.push(`  ${set.exercise_name}: ${set.reps} reps${weightPart}`)
        }
        lines.push('')
      }
    }

    if (prsResult.rows.length > 0) {
      lines.push('=== PERSONAL RECORDS ===')
      for (const pr of prsResult.rows) {
        lines.push(`${pr.exercise_name}: ${pr.max_weight_lbs} lbs`)
      }
      lines.push('')
    }

    const w = wellnessResult.rows[0]
    if (w && w.avg_pain !== null) {
      lines.push('=== WELLNESS (last 30 days) ===')
      lines.push(`Avg pain: ${w.avg_pain}/10 | Avg energy: ${w.avg_energy}/10 | Avg mood: ${w.avg_mood}/10`)
    }

    res.type('text').send(lines.join('\n'))
  } catch (err) {
    console.error(err)
    res.status(500).type('text').send('Server error')
  }
})

module.exports = router
```

- [ ] **Step 4: Mount the route in `server/app.js`**

Add these two lines to `server/app.js`. The require goes with the other requires at the top; the `app.use` goes before the error handler (after the existing `app.use` block):

```js
// Add with other requires at top:
const publicRoutes = require('./routes/public')

// Add before the error handler middleware:
app.use('/api/public', publicRoutes)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd server && npm test -- --testPathPattern=public 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 6: Run full server test suite to verify no regressions**

```bash
cd server && npm test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/routes/public.js server/app.js server/__tests__/public.test.js
git commit -m "feat: add public stats endpoint GET /api/public/user/:userId"
```

---

## Task 2: Template parser utility

**Files:**
- Create: `client/src/utils/parseClaudeTemplate.js`
- Create: `client/src/__tests__/parseClaudeTemplate.test.js`

- [ ] **Step 1: Write the failing tests**

Create `client/src/__tests__/parseClaudeTemplate.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { parseClaudeTemplate } from '../utils/parseClaudeTemplate'

const exercises = [
  { id: 1, name: 'Bench Press' },
  { id: 2, name: 'Squat' },
  { id: 3, name: 'Pull-up' },
]

describe('parseClaudeTemplate', () => {
  it('parses a weighted line', () => {
    const { parsed, unrecognized } = parseClaudeTemplate('Bench Press: 3x8 @ 185', exercises)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual({
      exerciseName: 'Bench Press',
      exerciseId: 1,
      sets: 3,
      reps: 8,
      weight: 185,
    })
    expect(unrecognized).toHaveLength(0)
  })

  it('parses a bodyweight line with no weight', () => {
    const { parsed } = parseClaudeTemplate('Pull-up: 3x8', exercises)
    expect(parsed[0].weight).toBeNull()
    expect(parsed[0].sets).toBe(3)
    expect(parsed[0].reps).toBe(8)
    expect(parsed[0].exerciseId).toBe(3)
  })

  it('matches exercise names case-insensitively', () => {
    const { parsed } = parseClaudeTemplate('bench press: 3x8 @ 185', exercises)
    expect(parsed[0].exerciseId).toBe(1)
  })

  it('sets exerciseId to null when exercise is not in the list', () => {
    const { parsed } = parseClaudeTemplate('Romanian Deadlift: 3x10 @ 135', exercises)
    expect(parsed[0].exerciseId).toBeNull()
    expect(parsed[0].exerciseName).toBe('Romanian Deadlift')
    expect(parsed[0].sets).toBe(3)
    expect(parsed[0].reps).toBe(10)
    expect(parsed[0].weight).toBe(135)
  })

  it('collects unrecognized lines', () => {
    const { unrecognized } = parseClaudeTemplate('not a valid line', exercises)
    expect(unrecognized).toEqual(['not a valid line'])
  })

  it('skips blank lines without adding to unrecognized', () => {
    const { parsed, unrecognized } = parseClaudeTemplate('\nBench Press: 3x8 @ 185\n\nSquat: 3x5 @ 225\n', exercises)
    expect(parsed).toHaveLength(2)
    expect(unrecognized).toHaveLength(0)
  })

  it('parses multiple exercises in one block', () => {
    const text = 'Bench Press: 3x8 @ 185\nSquat: 3x5 @ 225\nPull-up: 3x8'
    const { parsed } = parseClaudeTemplate(text, exercises)
    expect(parsed).toHaveLength(3)
    expect(parsed[2].exerciseName).toBe('Pull-up')
  })

  it('handles the × unicode multiplication sign', () => {
    const { parsed } = parseClaudeTemplate('Bench Press: 3×8 @ 185', exercises)
    expect(parsed[0].sets).toBe(3)
    expect(parsed[0].reps).toBe(8)
  })

  it('handles decimal weights', () => {
    const { parsed } = parseClaudeTemplate('Bench Press: 3x8 @ 135.5', exercises)
    expect(parsed[0].weight).toBe(135.5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npx vitest run src/__tests__/parseClaudeTemplate.test.js 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../utils/parseClaudeTemplate'`.

- [ ] **Step 3: Create `client/src/utils/parseClaudeTemplate.js`**

```js
/**
 * Parse a Claude-generated workout template into structured exercise data.
 *
 * Supported formats:
 *   "Exercise Name: 3x8 @ 185"  — weighted lift (weight in lbs)
 *   "Exercise Name: 3x8"        — bodyweight lift (weight: null)
 *   Blank lines are skipped. Unrecognized lines are collected.
 *
 * @param {string} text
 * @param {{ id: number, name: string }[]} exercises
 * @returns {{ parsed: Array<{exerciseName: string, exerciseId: number|null, sets: number, reps: number, weight: number|null}>, unrecognized: string[] }}
 */
export function parseClaudeTemplate(text, exercises) {
  const parsed = []
  const unrecognized = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match "Name: NxN" or "Name: N×N" with optional "@ W"
    const match = trimmed.match(/^(.+?):\s*(\d+)[xX×](\d+)(?:\s*@\s*([\d.]+))?/)
    if (!match) {
      unrecognized.push(trimmed)
      continue
    }

    const [, rawName, sets, reps, weight] = match
    const name = rawName.trim()
    const exercise = exercises.find(e => e.name.toLowerCase() === name.toLowerCase())

    parsed.push({
      exerciseName: name,
      exerciseId: exercise?.id ?? null,
      sets: parseInt(sets, 10),
      reps: parseInt(reps, 10),
      weight: weight != null ? parseFloat(weight) : null,
    })
  }

  return { parsed, unrecognized }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd client && npx vitest run src/__tests__/parseClaudeTemplate.test.js 2>&1 | tail -15
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/parseClaudeTemplate.js client/src/__tests__/parseClaudeTemplate.test.js
git commit -m "feat: add parseClaudeTemplate utility"
```

---

## Task 3: WorkoutLogger import banner & modal

**Files:**
- Modify: `client/src/screens/WorkoutLogger.jsx`
- Modify: `client/src/__tests__/WorkoutLogger.test.jsx`

**Context on WorkoutLogger state:** The component uses `loggedExercises` (array of `{ exerciseId, exerciseName, sets: [{ weight, reps, confirmed }] }`). Sets are **only posted to the API when `finish()` is called** — not on each input. The import pre-fills `loggedExercises` in UI state so the user can review/adjust, then `finish()` saves everything normally. New exercises (those not matched in `allExercises`) are created immediately via `POST /exercises` to obtain their IDs.

- [ ] **Step 1: Add failing tests to `client/src/__tests__/WorkoutLogger.test.jsx`**

Append this new `describe` block to the existing file (after the last `})` closing the existing `describe`):

```js
describe('WorkoutLogger — import banner & modal', () => {
  it('shows import banner when no exercises have been added', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))
    expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument()
  })

  it('opens the import modal when the banner is clicked', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))
    expect(screen.getByTestId('import-modal')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Paste Claude template' })).toBeInTheDocument()
  })

  it('closes the modal when cancel is clicked', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))
    fireEvent.click(screen.getByTestId('import-cancel-btn'))
    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
  })

  it('creates a new exercise and pre-fills the logger when importing an unknown exercise', async () => {
    api.post
      .mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] })   // POST /workouts
      .mockResolvedValueOnce({ id: 99, name: 'Romanian Deadlift', muscle_group: 'other' }) // POST /exercises

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))

    fireEvent.change(screen.getByRole('textbox', { name: 'Paste Claude template' }), {
      target: { value: 'Romanian Deadlift: 3x8 @ 135' },
    })
    fireEvent.click(screen.getByTestId('import-submit-btn'))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/exercises', {
        name: 'Romanian Deadlift',
        muscle_group: 'other',
      })
    )
    await waitFor(() => expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument())
    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
  })

  it('pre-fills a known exercise without creating a new one', async () => {
    api.post.mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] }) // POST /workouts only

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))

    fireEvent.change(screen.getByRole('textbox', { name: 'Paste Claude template' }), {
      target: { value: 'Clamshell: 3x15' }, // 'Clamshell' is in the mock exercises list (id: 1)
    })
    fireEvent.click(screen.getByTestId('import-submit-btn'))

    await waitFor(() => expect(screen.getByText('Clamshell')).toBeInTheDocument())
    // POST /exercises should NOT have been called for a known exercise
    expect(api.post).not.toHaveBeenCalledWith('/exercises', expect.any(Object))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npx vitest run src/__tests__/WorkoutLogger.test.jsx 2>&1 | tail -20
```

Expected: The new 5 tests FAIL (import-banner-btn not found, etc.). The existing 5 tests should still PASS.

- [ ] **Step 3: Add import to WorkoutLogger.jsx**

At the top of `client/src/screens/WorkoutLogger.jsx`, add the import after the existing imports:

```js
import { parseClaudeTemplate } from '../utils/parseClaudeTemplate'
```

- [ ] **Step 4: Add state variables to WorkoutLogger.jsx**

In the `WorkoutLogger` function body, after the existing state declarations (after `workoutNotes`), add:

```js
const [importModalOpen, setImportModalOpen] = useState(false)
const [importText, setImportText] = useState('')
const [importing, setImporting] = useState(false)
```

- [ ] **Step 5: Add `handleImport` function to WorkoutLogger.jsx**

Add this function after the `saveNotes` function (before the `return` statement):

```js
async function handleImport() {
  const { parsed, unrecognized } = parseClaudeTemplate(importText, allExercises)
  if (parsed.length === 0) {
    alert('No exercises found. Check the format: "Exercise Name: 3x8 @ 185"')
    return
  }
  setImporting(true)
  try {
    const createdExercises = []
    for (const entry of parsed) {
      let exerciseId = entry.exerciseId
      let exerciseName = entry.exerciseName
      if (exerciseId === null) {
        const ex = await api.post('/exercises', { name: exerciseName, muscle_group: 'other' })
        exerciseId = ex.id
        exerciseName = ex.name
        createdExercises.push(ex)
      }
      setLoggedExercises(prev => {
        if (prev.find(e => e.exerciseId === exerciseId)) return prev
        return [...prev, {
          exerciseId,
          exerciseName,
          sets: Array.from({ length: entry.sets }, () => ({
            weight: entry.weight !== null ? String(entry.weight) : '',
            reps: String(entry.reps),
            confirmed: true,
          })),
        }]
      })
    }
    if (createdExercises.length > 0) {
      setAllExercises(prev => [...prev, ...createdExercises])
    }
    setImportModalOpen(false)
    setImportText('')
    if (unrecognized.length > 0) {
      alert(`Imported ${parsed.length} exercise(s). ${unrecognized.length} line(s) couldn't be parsed.`)
    }
  } catch (err) {
    alert('Import failed: ' + err.message)
  } finally {
    setImporting(false)
  }
}
```

- [ ] **Step 6: Add import banner JSX to WorkoutLogger.jsx**

In the JSX `return`, add the banner block **immediately before** the `{showNewForm ? (` block. The banner should only render when `loggedExercises.length === 0`:

```jsx
{loggedExercises.length === 0 && (
  <>
    <button
      data-testid="import-banner-btn"
      style={{
        border: '1px dashed #4db6f755',
        borderRadius: 10,
        padding: 12,
        color: '#4db6f7',
        fontSize: 13,
        cursor: 'pointer',
        width: '100%',
        marginBottom: 8,
        background: '#4db6f710',
      }}
      onClick={() => setImportModalOpen(true)}
    >
      📋 Import from Claude template
    </button>
    <div style={{ textAlign: 'center', color: '#555', fontSize: 12, marginBottom: 12 }}>
      — or add exercises below —
    </div>
  </>
)}
```

- [ ] **Step 7: Add import modal JSX to WorkoutLogger.jsx**

Add the modal **immediately before** the final closing `</div>` of the return (the one that closes `<div style={s.page}>`):

```jsx
{importModalOpen && (
  <div
    data-testid="import-modal"
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'flex-start',
      padding: '60px 16px 20px',
      zIndex: 100,
    }}
  >
    <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>Import Claude Template</div>
      <div style={{ fontSize: 12, color: '#888' }}>
        Paste the workout template Claude generated for you:
      </div>
      <textarea
        aria-label="Paste Claude template"
        style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, minHeight: 160, outline: 'none', resize: 'none', width: '100%' }}
        value={importText}
        onChange={e => setImportText(e.target.value)}
        placeholder={'Bench Press: 3x8 @ 185\nSquat: 3x5 @ 225\nPull-up: 3x8'}
      />
      <button
        data-testid="import-submit-btn"
        style={{ background: '#7c6af7', border: 'none', borderRadius: 10, padding: 13, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        onClick={handleImport}
        disabled={importing || !importText.trim()}
      >
        {importing ? 'Importing...' : 'Import'}
      </button>
      <button
        data-testid="import-cancel-btn"
        style={{ background: 'none', border: 'none', color: '#7c6af7', fontSize: 13, cursor: 'pointer', padding: 8 }}
        onClick={() => { setImportModalOpen(false); setImportText('') }}
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 8: Run tests to verify all pass**

```bash
cd client && npx vitest run src/__tests__/WorkoutLogger.test.jsx 2>&1 | tail -20
```

Expected: All 10 tests PASS (5 existing mobility tests + 5 new import tests).

- [ ] **Step 9: Commit**

```bash
git add client/src/screens/WorkoutLogger.jsx client/src/__tests__/WorkoutLogger.test.jsx
git commit -m "feat: add Claude template import banner and modal to WorkoutLogger"
```

---

## Task 4: Settings stats URL section

**Files:**
- Modify: `client/src/pages/Settings.jsx`
- Create: `client/src/__tests__/Settings.test.jsx`

**Context:** `currentUser` comes from `useAuth()` and has `id`, `name`, `email`. The stats URL is built from `VITE_API_URL` (same env var the API client uses). In tests, `VITE_API_URL` is undefined so the base falls back to `/api`.

- [ ] **Step 1: Write the failing test**

Create `client/src/__tests__/Settings.test.jsx`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Settings from '../pages/Settings'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 42, name: 'Joe', email: 'joe@test.com' },
    logout: vi.fn(),
  }),
}))

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      water_enabled: false, water_interval_hours: 2, water_start_hour: 8, water_end_hour: 20,
      creatine_enabled: false, creatine_hour: 8,
      workout_enabled: false, workout_hour: 18,
    }),
    put: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../services/pushService', () => ({
  requestAndSubscribe: vi.fn(),
  isSupported: () => false,
  currentPermission: () => 'default',
}))

describe('Settings — Claude personal trainer section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays a stats URL containing the user id', () => {
    render(<Settings />)
    // VITE_API_URL is undefined in tests, so base is /api
    expect(screen.getByText(/\/api\/public\/user\/42/)).toBeInTheDocument()
  })

  it('renders a "Copy Stats URL" button', () => {
    render(<Settings />)
    expect(screen.getByRole('button', { name: /Copy Stats URL/i })).toBeInTheDocument()
  })

  it('copy button shows "Copied!" immediately after click', () => {
    vi.useFakeTimers()
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: /Copy Stats URL/i }))
    expect(screen.getByRole('button', { name: /Copied!/i })).toBeInTheDocument()
  })

  it('copy button reverts to "Copy Stats URL" after 2 seconds', () => {
    vi.useFakeTimers()
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: /Copy Stats URL/i }))
    vi.advanceTimersByTime(2000)
    expect(screen.getByRole('button', { name: /Copy Stats URL/i })).toBeInTheDocument()
  })

  it('calls navigator.clipboard.writeText with the stats URL', () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: /Copy Stats URL/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/user/42')
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd client && npx vitest run src/__tests__/Settings.test.jsx 2>&1 | tail -20
```

Expected: FAIL — stats URL not found in document.

- [ ] **Step 3: Add state and helpers to `client/src/pages/Settings.jsx`**

In the `Settings` function body, add after the existing `useState` declarations:

```js
const [copied, setCopied] = useState(false)
const statsUrl = `${import.meta.env.VITE_API_URL ?? '/api'}/public/user/${currentUser?.id}`

function copyStatsUrl() {
  navigator.clipboard.writeText(statsUrl).catch(() => {})
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

- [ ] **Step 4: Add the stats URL section JSX to `client/src/pages/Settings.jsx`**

Insert this new section **immediately before** the existing Export Data section (`<div style={s.section}>` that contains `<div style={s.sectionLabel}>Export Data</div>`):

```jsx
<div style={s.section}>
  <div style={s.sectionLabel}>Claude Personal Trainer</div>
  <div style={s.card}>
    <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
      Paste this URL into Claude so it can read your workout stats:
    </div>
    <div style={s.inviteUrl}>{statsUrl}</div>
    <button style={{ ...s.btn(), marginTop: 8 }} onClick={copyStatsUrl}>
      {copied ? 'Copied!' : 'Copy Stats URL'}
    </button>
  </div>
</div>
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd client && npx vitest run src/__tests__/Settings.test.jsx 2>&1 | tail -20
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Run full client test suite to verify no regressions**

```bash
cd client && npx vitest run 2>&1 | tail -15
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Settings.jsx client/src/__tests__/Settings.test.jsx
git commit -m "feat: add Claude personal trainer stats URL to Settings"
```

---

## Final verification

- [ ] **Run all tests (server + client) one more time**

```bash
cd /path/to/repo
(cd server && npm test 2>&1 | tail -5) && (cd client && npx vitest run 2>&1 | tail -5)
```

Expected: All tests pass on both sides.
