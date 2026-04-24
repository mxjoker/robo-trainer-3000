# Full Calendar View — Design Spec
_2026-04-24_

## Summary

Replace the existing mini dot-grid on the Dashboard with a full month calendar. Tapping any day opens a bottom sheet with that day's workout and wellness summary. Empty days show quick-log buttons.

---

## Decisions Made

| Question | Decision |
|---|---|
| Where does the calendar live? | Replaces the mini dot-grid inline on Dashboard — no new nav tab |
| What does tapping a day do? | Opens a bottom sheet (slide-up overlay) |
| What do cells show? | Date number + colored dots (green = workout, purple = wellness) |
| Tapping an empty day? | Bottom sheet opens with empty state + "Log Workout" / "Log Wellness" buttons |
| Implementation approach | Extract CalendarGrid + DaySheet as components; Dashboard owns state and data |

---

## Architecture

Three pieces:

**`Dashboard.jsx`** (modified)
- Owns `currentMonth` (year + month integer) state
- Fetches workouts and wellness for the current month in parallel on mount and on month change
- Builds a `dayMap: { [YYYY-MM-DD]: { workout?, wellness? } }` lookup object
- Renders `<CalendarGrid>` and `<DaySheet>`
- Manages `selectedDate` state (null = sheet closed)

**`client/src/components/CalendarGrid.jsx`** (new)
- Pure display component — no fetching, no side effects
- Props: `dayMap`, `currentMonth`, `selectedDate`, `onDaySelect`, `onMonthChange`, `loading`
- Renders a 7-column CSS grid (Sun–Sat header + day cells)
- Prev/next month arrow buttons — disabled while `loading`
- Each cell shows: date number, green dot if `dayMap[date].workout` exists, purple dot if `dayMap[date].wellness` exists
- Today: purple border ring
- Future days: 40% opacity, still tappable (opens empty state sheet)
- Calls `onDaySelect(dateString)` on tap

**`client/src/components/DaySheet.jsx`** (new)
- Bottom sheet overlay: fixed position, slides up from bottom, backdrop behind it
- Props: `date`, `data` (the dayMap entry — may be undefined), `onClose`, `onLogWorkout`, `onLogWellness`
- Drag handle at top
- Date header (e.g. "Mon, Apr 21")
- **With workout data:** card showing routine name, exercise names (not full sets), duration in minutes
- **With wellness data:** card showing energy / mood / pain numbers, sleep hours, water ✓/✗, creatine ✓/✗
- **Empty state (no data):** "Nothing logged for [date]" + "Log Workout" button + "Log Wellness" button
- Dismiss: tap backdrop or drag-handle area

---

## Data Flow

1. Dashboard mounts or `currentMonth` changes
2. Parallel fetch: `GET /api/workouts?start=YYYY-MM-01&end=YYYY-MM-DD` (where end = last calendar day of that month) and same for wellness
3. Results merged into `dayMap` keyed by `YYYY-MM-DD`
4. `dayMap` passed to `CalendarGrid` for dot rendering
5. User taps a cell → Dashboard sets `selectedDate`
6. `DaySheet` opens with `dayMap[selectedDate]` (undefined for empty days)
7. User taps backdrop or dismiss → `selectedDate = null`, sheet closes

Both API endpoints already support `start`/`end` query params — no backend changes needed.

---

## CalendarGrid — Cell States

| State | Visual |
|---|---|
| No data | Date number only, no dots |
| Workout logged | Date number + green dot below |
| Wellness logged | Date number + purple dot below |
| Both logged | Date number + green dot + purple dot below |
| Today | Purple border ring around cell |
| Future | 40% opacity, tappable (empty state sheet) |
| Loading | Dots replaced by faint gray placeholders; nav arrows disabled |

---

## DaySheet — Contents

**Workout card (shown if `data.workout` exists):**
- Routine name (or "Workout" if no routine)
- Exercise names listed (not full sets — that's a future detail page feature)
- Duration in minutes

**Wellness card (shown if `data.wellness` exists):**
- Energy, Mood, Pain — numeric values with icons
- Sleep hours
- Water taken ✓/✗
- Creatine taken ✓/✗

**Empty state (no workout AND no wellness):**
- "Nothing logged for [date]"
- "Log Workout" button → navigates to `/log/workout` (logs for today; date pre-fill is out of scope)
- "Log Wellness" button → navigates to `/log/wellness` (logs for today; date pre-fill is out of scope)

---

## Loading & Error States

- **In-flight fetch:** CalendarGrid shows skeleton dots (faint gray circles), prev/next arrows disabled
- **Fetch error:** Inline error message below the grid with a retry button
- **No data for a day:** No dots — no special treatment, sheet opens normally on tap

---

## Files Changed

| File | Change |
|---|---|
| `client/src/pages/Dashboard.jsx` | Replace mini-calendar block with `<CalendarGrid>` + `<DaySheet>`, add month/selectedDate state, add parallel fetch |
| `client/src/components/CalendarGrid.jsx` | New component |
| `client/src/components/DaySheet.jsx` | New component |

No backend changes required.

---

## Out of Scope

- Full set-by-set workout detail from the calendar (future: tap workout card in sheet to go to detail page)
- Editing or deleting logs from the calendar view
- Mobility/stretching logs (separate Phase 2 feature)
- Progress photos (separate Phase 2 feature)
