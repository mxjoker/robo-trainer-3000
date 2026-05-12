# Fix List 2 — Design Spec
_Date: 2026-05-12_

## Overview

Five improvements to the Robo-Trainer-3000 fitness app, in priority order:

1. Color scheme overhaul — replace hardcoded colors with CSS vars, new default and presets
2. DaySheet set details — expand workout card to show full set list, plus Edit and Delete
3. Per-set auto-save + auto-resume today's workout
4. Delete workouts + edit from history (wired via DaySheet)
5. Standalone progress photos for self and partner

Photo upload (Cloudinary env vars) is already resolved — no code changes needed.

---

## 1. Color Scheme Overhaul

### Goal
Every component currently uses hardcoded `#7c6af7` (purple), `#a090ff`, `#7c6af722`, and `#f7a76c` (partner orange). These need to become CSS variables so the per-user color picker actually works.

### Changes

**`client/src/context/ThemeContext.jsx`**
- Change default scheme from `'purple'` to `'blue'`
- Rename `coral` preset → `pink` with new values:
  - accent: `#f472b6`
  - accentDim: `#f9a8d4`
  - accentBg: `#f472b622`

**All 24 client files with hardcoded accent colors** — replace inline style string literals:
- `#7c6af7` → `var(--accent)`
- `#a090ff` → `var(--accent-dim)`
- `#7c6af722` → `var(--accent-bg)`

Files affected (from grep):
`CalendarGrid.jsx`, `WorkoutLogger.jsx`, `SharedWorkoutLogger.jsx`, `SparkBar.jsx`,
`WellnessLogger.jsx`, `FAB.jsx`, `LogSheet.jsx`, `DaySheet.jsx`, `DualLineChart.jsx`,
`StatCard.jsx`, `BottomNav.jsx`, `Stats.jsx`, `ExerciseManager.jsx`, `AcceptInvite.jsx`,
`Photos.jsx`, `Dashboard.jsx`, `Register.jsx`, `Settings.jsx`, `Login.jsx`, `Profile.jsx`

**Partner/pain color** (hardcoded, no CSS var):
- Replace `#f7a76c` → `#f472b6` in exactly 2 places:
  - `DaySheet.jsx` line 165: wellness pain indicator color
  - `Photos.jsx` line 25: `partnerTag` background

**`Profile.jsx` color picker:**
- Update local `colors` map: `coral: '#f76c6c'` → `pink: '#f472b6'`
- The picker renders from `schemes` (driven by `Object.keys(SCHEMES)`) so the label updates automatically

### Constraints
- CSS vars work fine in inline style objects: `{ color: 'var(--accent)' }` — no architecture change needed
- Test files that assert specific color values (`ThemeContext.test.jsx`, `SparkBar.test.jsx`, `WellnessLogger.test.jsx`) will need their expected values updated

---

## 2. DaySheet Set Details + Edit/Delete

### Goal
Tapping a workout day currently shows only exercise names. It should expand to show sets, and surface Edit and Delete actions.

### State additions to `DaySheet`
```js
const [expandedSets, setExpandedSets] = useState(false)
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
```

### Workout card behavior
- **Collapsed (default):** title + exercise names (dot-separated) + ▾ chevron. The entire card is tappable to toggle `expandedSets`.
- **Expanded:** title + sets grouped by exercise. For each exercise: name header, then rows of `set_number · weight_lbs lbs × reps`. Uses `workout.sets` which is already in the prop (the API returns it).

### Edit Workout button
Always visible below the workout card (not gated on `expandedSets`). DaySheet uses callback props for navigation (consistent with `onLogWorkout`/`onLogWellness`). Fires a new `onEditWorkout(workoutId)` prop — Dashboard handles it:
```js
onEditWorkout={id => { setSelectedDate(null); navigate('/log/workout', { state: { resumeWorkoutId: id } }) }}
```

### Delete button (🗑)
Sits next to Edit. Two states:
- **Normal:** shows 🗑 icon button
- **Confirming:** replaces button pair with inline "Delete workout?" text + "Delete" (red) and "Cancel" buttons

On confirm:
```js
await api.delete(`/workouts/${workout.id}`)
onWorkoutDelete(workout.id)  // new prop
```

### New prop: `onWorkoutDelete(workoutId)`
Called after successful delete. Parent (Dashboard) removes the day's workout data from its state and closes the sheet.

---

## 3. Per-Set Auto-Save + Auto-Resume Today's Workout

### Goal
Sets are currently batched and POSTed only on `finish()`. Instead, each confirmed set is saved immediately. On open, if a workout for today already exists in the DB, it is auto-resumed.

### Set state shape change
`makeSet()` gains a `dbId: null` field:
```js
function makeSet(prev = null) {
  return { weight: prev?.weight ?? '', reps: prev?.reps ?? '10', confirmed: false, dbId: null }
}
```

When loading an existing workout for resume, sets are initialized with their real `dbId` from the API response.

### Mount logic (replaces current `useEffect`)
```
today = new Date().toISOString().split('T')[0]
workouts = GET /api/workouts?start=today&end=today

if workouts.length > 0:
  todayWorkout = workouts[0]
  setWorkoutId(todayWorkout.id)
  populate loggedExercises from todayWorkout.sets (with dbId filled)
  if todayWorkout.sets.length > 0:
    setWeightModalDone(true)   // skip weight modal
  // else: show weight modal (workout exists but empty)
else:
  POST /workouts  →  setWorkoutId(new id)
  // show weight modal
```

Also loads exercises, routines, PRs as today.

### `confirmSet` — per-set save
After updating state to `confirmed: true`, fire async save:
```js
if (set.dbId === null) {
  const saved = await api.post(`/workouts/${workoutId}/sets`, {
    exercise_id, set_number, weight_lbs, reps
  })
  // store saved.id back into state as dbId
} else {
  await api.put(`/workouts/sets/${set.dbId}`, { weight_lbs, reps })
}
```
Save is **optimistic** — the UI confirms immediately, the API call happens in the background. Failures show a non-blocking error banner at the top of the page (not an alert). The banner is dismissible and clears on the next successful save.

### `finish()` simplification
No longer iterates and POSTs sets — all confirmed sets are already in the DB. `finish()` only needs to:
1. Save workout notes (already done via `saveNotes`)
2. Navigate to `/`

The `saving` state and its spinner button label remain for the brief navigation delay.

### "Save for later" → "Continue Later"
The cancel modal's "Save for later" button becomes "Continue Later". It calls `navigate('/')` only — no `localStorage.setItem`. The workout is already persisted in the DB and will be auto-resumed on next open.

Remove all `localStorage.getItem/setItem/removeItem` calls for `rt_active_workout_id` from WorkoutLogger.

### One workout per day constraint
If a workout for today already exists, the mount logic reuses it — no second workout is created. Users who want a second workout for the same day must delete the existing one first.

---

## 4. Delete Workouts + Edit from History

### Edit from DaySheet
Covered in Section 2. The Edit button passes `resumeWorkoutId` to WorkoutLogger, which Section 3's mount logic handles.

### Delete from DaySheet
Covered in Section 2. `DELETE /api/workouts/:id` already exists in `server/routes/workouts.js`.

### Orphaned row cleanup — migration 010
One-time migration to delete workouts with no sets and no mobility sets. Prevents these rows from being erroneously auto-resumed.

```sql
-- 010_cleanup_empty_workouts.sql
DELETE FROM workouts
WHERE id IN (
  SELECT w.id FROM workouts w
  LEFT JOIN sets s ON s.workout_id = w.id
  LEFT JOIN mobility_sets ms ON ms.workout_id = w.id
  WHERE s.id IS NULL AND ms.id IS NULL
);
```

Per-set auto-save prevents new orphans from accumulating going forward.

---

## 5. Standalone Progress Photos (Self + Partner)

### Goal
Photos page currently only shows photos attached to workouts. Add a dedicated `progress_photos` table and UI for uploading standalone photos for either user.

### DB — migration 011

```sql
-- 011_add_progress_photos.sql
CREATE TABLE progress_photos (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  photo_url   TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX progress_photos_user_date ON progress_photos(user_id, date DESC);
```

### Server — `server/routes/photos.js` (new file)
All routes behind `verifyToken`.

```
GET  /api/photos          — list user's standalone photos, ORDER BY date DESC
POST /api/photos          — insert row { user_id, date, photo_url, notes }
DELETE /api/photos/:id    — ownership check + delete
```

Mounted in `app.js` at `/api/photos`.

### Server — additions to `server/routes/partner.js`
```
GET    /api/partner/photos        — list partner's standalone photos
POST   /api/partner/photos        — insert with user_id = partnerId
DELETE /api/partner/photos/:id    — ownership check on partner's id + delete
```

Partner routes use the same `partnerId` lookup pattern as existing partner routes.

### Client — `Photos.jsx` load
Fire all four in parallel (skipping partner calls if `currentUser.partner_id` is null):
```js
const [myWorkouts, myPhotos, partnerWorkouts, partnerPhotos] = await Promise.all([
  api.get('/workouts'),
  api.get('/photos'),
  hasPartner ? api.get('/partner/workouts').catch(() => []) : [],
  hasPartner ? api.get('/partner/photos').catch(() => [])  : [],
])
```

Merge into unified list, each item tagged:
```js
{ ...item, type: 'workout'|'standalone', isPartner: true|false }
```

Sort by `date` descending, group by month (same `monthLabel` helper already in place).

### Grid tiles
- **Own workout photo:** existing tile, no badge change
- **Partner workout photo:** existing "P" pink dot badge
- **Own standalone photo:** 📷 badge (bottom-left)
- **Partner standalone photo:** 📷 badge + pink "P" dot (both)

### Upload button
A ➕ button fixed to the bottom-right of the Photos page (above BottomNav, `zIndex: 200`, same visual style as the global `FAB.jsx` but implemented inline in `Photos.jsx` — the global FAB is tied to LogSheet and not reused here). Opens an upload bottom sheet with:
- **Mine / Partner** toggle (only shown if user has a partner)
- **Date** input, type `date`, defaulting to today
- **Notes** text input (optional, single line)
- **Add Photo** button → file picker → Cloudinary upload → POST to `/api/photos` or `/api/partner/photos` based on toggle

On success, prepend the new photo to the appropriate group in state without a full reload.

### Lightbox
- **Own workout photo:** existing behavior (no change)
- **Partner workout photo:** existing "Change photo" button (no change)
- **Own standalone photo:** shows date + notes + a ✕ delete button (calls `DELETE /api/photos/:id`)
- **Partner standalone photo:** shows date + notes + "Change photo" button (calls `PUT` equivalent via partner route)

---

## File Change Summary

| File | Change |
|------|--------|
| `client/src/context/ThemeContext.jsx` | Default → blue, coral → pink preset |
| 20 client component/page files | Hardcoded accent colors → CSS vars |
| `client/src/components/DaySheet.jsx` | Set expansion toggle, Edit/Delete buttons, `onWorkoutDelete` prop |
| `client/src/screens/WorkoutLogger.jsx` | Per-set save, auto-resume mount logic, set `dbId` state, simplify finish(), remove localStorage |
| `client/src/pages/Photos.jsx` | 4-source load, standalone tiles + badges, upload FAB + modal, lightbox delete |
| `client/src/pages/Dashboard.jsx` | Wire `onWorkoutDelete` and `onEditWorkout` props to DaySheet |
| `server/routes/photos.js` | New file — GET/POST/DELETE /api/photos |
| `server/routes/partner.js` | Add GET/POST/DELETE for partner standalone photos |
| `server/app.js` | Mount `/api/photos` route |
| `server/db/migrations/010_cleanup_empty_workouts.sql` | One-time delete of empty workouts |
| `server/db/migrations/011_add_progress_photos.sql` | New progress_photos table |
| Test files | Update hardcoded color assertions |
