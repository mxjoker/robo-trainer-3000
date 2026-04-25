# Mobility & Stretching Logs — Design Spec
_2026-04-24_

## Summary

Add mobility/stretching logging to the workout logger. After finishing their strength work, users can expand a collapsed "Mobility & Stretching" section, pick exercises from the existing exercise pool, and log a duration (in seconds) per exercise. Mobility data is stored in a new `mobility_sets` table linked to the workout. It folds into the existing green workout dot on the calendar with no new dot color needed.

---

## Decisions Made

| Question | Decision |
|---|---|
| What is logged per exercise? | Duration in seconds only — no weight/reps |
| Where does it live? | Collapsed section at bottom of WorkoutLogger, expands on tap |
| Where do exercises come from? | Same exercise pool as strength workouts |
| Notes field? | Reuse `workouts.notes` column — exposed inside the mobility section |
| Calendar impact? | None — folds into existing green workout dot |
| Storage approach? | New `mobility_sets` table (mirrors `sets` pattern) |

---

## Architecture

### Database

New table `mobility_sets`:

```sql
CREATE TABLE IF NOT EXISTS mobility_sets (
  id            SERIAL PRIMARY KEY,
  workout_id    INTEGER REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id   INTEGER REFERENCES exercises(id) ON DELETE RESTRICT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobility_sets_workout_id ON mobility_sets(workout_id);
```

Migration file: `server/db/migrations/004_add_mobility.sql`

No changes to existing tables. `workouts.notes` is already present and will be surfaced in the UI.

---

### Backend

**File modified:** `server/routes/workouts.js`

Four changes:

1. **`POST /api/workouts/:id/mobility`** — add a mobility exercise to a workout
   - Body: `{ exercise_id, duration_seconds, sort_order }`
   - Returns the new row

2. **`DELETE /api/workouts/:id/mobility/:setId`** — remove a mobility exercise
   - Returns 204

3. **`GET /api/workouts/:id`** — extend to include `mobility_sets` with exercise names
   - Join `mobility_sets` with `exercises` to return `exercise_name` alongside each row
   - Returns: `{ ...workout, sets: [...], mobility_sets: [{ id, exercise_id, exercise_name, duration_seconds, sort_order }] }`

4. **`PUT /api/workouts/:id`** — update workout notes
   - Body: `{ notes }`
   - Returns the updated workout row (if this route doesn't already exist, add it)

---

### Frontend

**File modified:** `client/src/screens/WorkoutLogger.jsx`

Add a mobility section below the strength exercises section, above the "Finish Workout" button.

**Collapsed state (default):**
- A dashed button: `＋ Add Mobility / Stretching`
- Tapping sets `mobilityExpanded = true`

**Expanded state:**
- Header: "Mobility & Stretching"
- List of added mobility exercises: `exercise_name` + `duration_seconds` formatted as seconds + remove (×) button
- Add row: exercise picker dropdown (same component as strength section) + seconds input + "Add" button
  - On "Add": POST `/api/workouts/:id/mobility`, optimistically append to local state
  - On ×: DELETE `/api/workouts/:id/mobility/:setId`, remove from local state
- Notes textarea (maps to `workouts.notes`) — optional, "How did it feel?"
  - On blur: PUT `/api/workouts/:id` with `{ notes }` to persist

**New state added to WorkoutLogger:**
- `mobilityExpanded` (boolean, default false)
- `mobilitySets` (array of `{ id, exercise_id, exercise_name, duration_seconds }`)
- `mobilityDurationInput` (string, controlled input for the seconds field)
- `workoutNotes` (string, controlled input for notes)

WorkoutLogger always creates a fresh workout on mount — there is no resume flow.

---

**File modified:** `client/src/components/DaySheet.jsx`

Update the workout card to show mobility exercises when present:

- If `workout.mobility_sets` has entries, render a teal line below the exercise list:
  `Mobility: Hip Flexor Stretch · Pigeon Pose`
- If `workout.notes` is set, render it as a small note below the card

---

## Data Flow

1. User opens WorkoutLogger — workout created on mount (existing behavior)
2. User logs strength sets (existing behavior)
3. User taps "＋ Add Mobility / Stretching" → section expands
4. User picks exercise + enters seconds + taps "Add" → POST `/api/workouts/:id/mobility`
5. Row appended to `mobilitySets` state; renders in list immediately
6. User taps × on an entry → DELETE `/api/workouts/:id/mobility/:setId`
7. User types notes → on blur, PUT `/api/workouts/:id` with `{ notes }`
8. User taps "Finish Workout" → navigates to Dashboard (mobility already persisted)
9. Dashboard calendar fetches workouts for month — `GET /api/workouts?start=…&end=…`
   - No change needed: mobility dot folds into green workout dot
10. User taps a workout day → DaySheet shows `mobility_sets` line if present

---

## Files Changed

| File | Change |
|---|---|
| `server/db/migrations/004_add_mobility.sql` | New migration — creates `mobility_sets` table |
| `server/routes/workouts.js` | Add POST + DELETE mobility routes; extend GET /:id to include mobility_sets |
| `client/src/screens/WorkoutLogger.jsx` | Add collapsed mobility section with exercise picker, duration input, notes |
| `client/src/components/DaySheet.jsx` | Show mobility exercises and workout notes in workout card |

---

## Out of Scope

- Standalone mobility-only sessions (not attached to a workout)
- Per-exercise notes
- Mobility-specific dot color on the calendar
- Mobility history / stats view
- Editing duration after adding (remove and re-add instead)
