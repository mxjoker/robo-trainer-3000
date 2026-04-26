# Progress Photos — Design Spec
_2026-04-26_

## Overview

Users can attach one progress photo to any workout log entry to track visual changes over time. Photos are managed from the calendar day view (DaySheet) and browsable in a dedicated gallery screen. Partner's photos are visible but not editable.

## Decisions Made

| Question | Decision |
|---|---|
| Entry point | DaySheet only (not the WorkoutLogger) |
| Photos per workout | One |
| Partner visibility | Visible, read-only |
| Gallery | Yes — new bottom nav tab |
| Storage | Cloudinary (unsigned upload preset) |

## Data Model

**Migration 005** — single column added to `workouts`:

```sql
ALTER TABLE workouts ADD COLUMN photo_url TEXT;
```

`photo_url` is nullable. `getWorkoutWithSets()` already uses `SELECT * FROM workouts` so it returns `photo_url` in every workout response with no query changes.

## Backend

### New endpoint

```
PUT /api/workouts/:id/photo
Auth: required (verifyToken)
Body: { photo_url: string | null }
Response: updated workout object (via getWorkoutWithSets)
```

- Verifies workout belongs to requesting user (same ownership check as existing `PUT /api/workouts/:id`)
- Passing `null` clears the photo
- No file handling on the server — Cloudinary upload is entirely client-side

### Existing endpoints

No changes needed. `/api/workouts`, `/api/workouts/:id`, and `/api/partner` all return workout rows — `photo_url` is included automatically.

## Frontend

### Environment variables (Netlify)

| Variable | Purpose |
|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset name |

### Cloudinary upload utility (`client/src/services/cloudinaryService.js`)

- Accepts a `File` object
- Resizes/compresses to max 1200px long edge using `canvas` before uploading (keeps uploads fast, storage small)
- POSTs to `https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload` with the preset
- Returns `secure_url` from the Cloudinary response

### DaySheet changes (`client/src/components/DaySheet.jsx`)

Two states rendered below the workout card (only when a workout exists for the day):

**No photo:** dashed tap target with camera emoji and "Add progress photo" label. Tapping opens the file picker.

**Photo present:** photo rendered full-width with rounded corners; "Change" and "Remove" buttons beneath it. Change re-opens file picker; Remove calls `PUT /api/workouts/:id/photo` with `null`.

Partner workouts: photo shown (if present) but no Change/Remove controls.

### Gallery page (`client/src/pages/Photos.jsx`)

- New route: `/photos`
- New bottom nav tab: 📷 icon, label "Photos"
- On mount: fetches `GET /api/workouts` (no date filter, all workouts) and `GET /api/partner` (for partner workouts if a partner exists); filters client-side to those with non-null `photo_url`, sorts newest first
- Grouped by month
- 2-column grid; each tile: photo + caption (date · workout notes or routine name)
- Partner photos get a subtle color tag (matching existing partner color `#f7a76c`)
- Tapping a tile navigates to the Dashboard with that date selected: `navigate('/', { state: { selectedDate: workout.date } })`; Dashboard reads `location.state?.selectedDate` on mount to open the DaySheet for that date
- Empty state: "No progress photos yet. Add one from any workout day."

### BottomNav changes (`client/src/components/BottomNav.jsx`)

Add Photos tab after Stats. Final order: Dashboard | Stats | Photos | Partner | Settings.

## Error Handling

- Upload failure → inline error message on DaySheet; `photo_url` unchanged
- Workout with no sets → photo section not rendered (no workout to attach to)
- Network error on remove → show error, keep existing photo displayed

## Testing

**Server** (`server/__tests__/workouts.test.js` or new file):
- `PUT /api/workouts/:id/photo` sets `photo_url`
- `PUT /api/workouts/:id/photo` with `null` clears `photo_url`
- Returns 404 for wrong-user workout

**Client:**
- DaySheet renders dashed upload target when `workout.photo_url` is null
- DaySheet renders photo + Change/Remove when `photo_url` is present
- DaySheet hides Change/Remove for partner workouts
- Photos page renders gallery grid from mocked workout data
- Photos page renders empty state when no photos exist
