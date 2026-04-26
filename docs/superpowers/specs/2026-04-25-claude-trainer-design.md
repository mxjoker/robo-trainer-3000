# Claude Personal Trainer Feature Design

## Overview

Two connected features that let Claude act as a personal trainer for Robo Trainer 3000 users:

1. **Public stats endpoint** — a read-only URL Claude can fetch to know the user's workout history and PRs (no auth required)
2. **Template import** — a plaintext format Claude can generate that the WorkoutLogger can parse and import to pre-fill exercises and sets

---

## Architecture

Four files touched, no new DB tables:

| File | Type | Change |
|---|---|---|
| `server/routes/public.js` | New | Public stats endpoint |
| `server/app.js` | Modify | Mount public routes at `/api/public` |
| `client/src/screens/WorkoutLogger.jsx` | Modify | Import banner + paste modal + parser |
| `client/src/pages/Settings.jsx` | Modify | Stats URL section with copy button |

---

## 1. Public Stats Endpoint

### Route

```
GET /api/public/user/:userId
```

No authentication. No token. Anyone with the URL can read.

### Implementation

File: `server/routes/public.js`

Three parallel queries via `Promise.all`:

**Recent workouts** (last 10):
```sql
SELECT w.id, w.date, w.notes,
       s.exercise_id, e.name as exercise_name,
       s.set_number, s.reps, s.weight_lbs
FROM workouts w
JOIN sets s ON s.workout_id = w.id
JOIN exercises e ON e.id = s.exercise_id
WHERE w.user_id = $1
ORDER BY w.date DESC, w.id DESC, s.exercise_id, s.set_number
LIMIT 200
```

Group rows by workout_id in JS, then cap to 10 distinct workouts.

**Personal records** (max weight per exercise, all time):
```sql
SELECT e.name as exercise_name, MAX(s.weight_lbs) as max_weight_lbs
FROM sets s
JOIN workouts w ON w.id = s.workout_id
JOIN exercises e ON e.id = s.exercise_id
WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL AND s.weight_lbs > 0
GROUP BY s.exercise_id, e.name
ORDER BY e.name
```

**Wellness averages** (last 30 days):
```sql
SELECT ROUND(AVG(pain_level)::numeric, 1) as avg_pain,
       ROUND(AVG(energy_level)::numeric, 1) as avg_energy,
       MODE() WITHIN GROUP (ORDER BY mood) as common_mood
FROM wellness_logs
WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '30 days'
```

**User lookup**: query `SELECT name FROM users WHERE id = $1` — if no row, return 404 `"User not found"`.

### Response Format

`Content-Type: text/plain`

```
Robo Trainer Stats for Joe
Last updated: April 25, 2026

=== RECENT WORKOUTS ===
Mon, Apr 21
  Bench Press: 3x8 @ 185 lbs
  Bench Press: 3x8 @ 185 lbs
  Squat: 3x5 @ 225 lbs

Wed, Apr 19
  Deadlift: 1x5 @ 315 lbs

=== PERSONAL RECORDS ===
Bench Press: 195 lbs
Deadlift: 315 lbs
Squat: 245 lbs

=== WELLNESS (last 30 days) ===
Avg pain: 2.1 | Avg energy: 7.4 | Most common mood: 😊
```

Workout sets are listed individually (not grouped) so Claude sees the full picture. If no wellness data, omit the wellness section. If no PRs, omit the PR section.

### Mounting

In `server/app.js`, add before the error handler:
```js
const publicRoutes = require('./routes/public')
app.use('/api/public', publicRoutes)
```

---

## 2. Template Format

Claude generates plaintext in this format, which the app parses:

```
Bench Press: 3x8 @ 185
Squat: 3x5 @ 225
Pull-up: 3x8
```

Rules:
- Weighted lift: `Exercise Name: SxR @ W` (S=sets, R=reps, W=weight in lbs — integer or decimal)
- Bodyweight lift: `Exercise Name: SxR` (no `@ W`)
- Mobility: not imported via template (mobility section has its own UI)
- Blank lines and unrecognized lines are silently skipped but counted
- Matching is case-insensitive against existing exercise names

---

## 3. WorkoutLogger Import Banner

### Banner (visible only when `sets.length === 0`)

Rendered above the "+ Add Exercise" button. When tapped, opens the paste modal. Banner disappears the moment the first set is added to the workout.

```jsx
{sets.length === 0 && (
  <button onClick={() => setImportModalOpen(true)}>
    📋 Import from Claude template
  </button>
)}
{sets.length === 0 && <div>— or add exercises below —</div>}
```

### Paste Modal

Full-screen overlay with:
- `<textarea>` for pasting template text (`aria-label="Paste Claude template"`)
- "Import" button (`data-testid="import-submit-btn"`)
- "Cancel" button (`data-testid="import-cancel-btn"`)

### Parser (pure function — `parseClaudeTemplate(text, exercises)`)

```
Input: raw string, existing exercises array
Output: { parsed: [{ exerciseName, exerciseId|null, sets, reps, weight }], unrecognized: string[] }
```

Line-by-line processing:
1. Trim line; skip if blank
2. Match `/^(.+?):\s*(\d+)x(\d+)(?:\s*@\s*([\d.]+))?$/i`
3. If no match → push to `unrecognized`
4. If match → look up name in exercises (case-insensitive) → set `exerciseId` or `null`

### Import Execution (`handleImport` async function)

For each parsed entry:
1. If `exerciseId === null`: `POST /api/exercises { name, muscle_group: 'other' }` → get new id
2. For each set (1..sets): `POST /api/workouts/:id/sets { exercise_id, set_number, reps, weight_lbs }`

All requests are sequential (avoid race conditions on exercise creation). After all requests, close modal. If any unrecognized lines, show an alert: `"Imported N exercises. X lines couldn't be parsed."`.

---

## 4. Settings — Stats URL

New section at the bottom of `Settings.jsx`, above the logout button.

```jsx
<div style={s.section}>
  <div style={s.sectionLabel}>Claude Personal Trainer</div>
  <div style={s.card}>
    <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
      Paste this URL into Claude so it can read your workout stats:
    </div>
    <div style={s.inviteUrl}>{statsUrl}</div>
    <button style={s.btn()} onClick={copyStatsUrl}>
      {copied ? 'Copied!' : 'Copy Stats URL'}
    </button>
  </div>
</div>
```

`statsUrl` = `https://robo-trainer-3000.netlify.app/api/public/user/${currentUser.id}`

Uses `navigator.clipboard.writeText`. Button text flips to "Copied!" for 2 seconds after click. Uses existing `currentUser` from `useAuth()` — no extra API call needed since the user object already contains `id`.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Unknown userId on stats endpoint | 404 `"User not found"` |
| DB error on stats endpoint | 500, logged server-side |
| Import: exercise creation fails | Alert user, stop import |
| Import: set creation fails | Alert user, stop import (partial import left as-is) |
| Clipboard not available | Silent fail (URL still visible to copy manually) |

---

## Testing

### Server

- `GET /api/public/user/999` with no matching user → 404
- `GET /api/public/user/:id` with data → plaintext response containing expected sections
- No auth header required

### Client

- `parseClaudeTemplate` unit tests:
  - Weighted line parsed correctly
  - Bodyweight line parsed correctly (weight = 0 or null)
  - Unrecognized line collected
  - Case-insensitive exercise name match
- WorkoutLogger tests:
  - Import banner visible when `sets.length === 0`
  - Import banner hidden after first set added
  - Modal opens on banner click
  - Cancel closes modal without importing
- Settings:
  - Stats URL contains user ID
  - Copy button changes label to "Copied!"
