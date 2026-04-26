# Progress Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users attach one progress photo to a workout log entry, manage it from the calendar DaySheet, and browse all photos in a new gallery screen.

**Architecture:** Photo files upload client-side to Cloudinary (unsigned preset); only the resulting URL is stored in a new `photo_url` column on the `workouts` table. The DaySheet component gains local photo state + an `onPhotoChange` callback to keep the parent Dashboard in sync. A new `/photos` route renders a 2-column monthly gallery.

**Tech Stack:** Cloudinary unsigned upload API, React useState/useRef, Vitest + @testing-library/react (client), Supertest + real Postgres (server)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `server/db/migrations/005_add_photo_url.sql` | Add `photo_url TEXT` to workouts |
| Modify | `server/__tests__/setup.js` | Run migration 005 during test setup |
| Modify | `server/routes/workouts.js` | Add `PUT /:id/photo` endpoint |
| Modify | `server/__tests__/workouts.test.js` | Tests for the new endpoint |
| Create | `client/src/services/cloudinaryService.js` | Resize image + upload to Cloudinary |
| Modify | `client/src/components/DaySheet.jsx` | Photo section (add/change/remove) |
| Modify | `client/src/__tests__/DaySheet.test.jsx` | Tests for photo states |
| Create | `client/src/pages/Photos.jsx` | Gallery page |
| Create | `client/src/__tests__/Photos.test.jsx` | Tests for gallery |
| Modify | `client/src/App.jsx` | Add `/photos` route |
| Modify | `client/src/components/BottomNav.jsx` | Add Photos tab |
| Modify | `client/src/pages/Dashboard.jsx` | Read `location.state.selectedDate` on mount |

---

## Task 1: Migration + test setup

**Files:**
- Create: `server/db/migrations/005_add_photo_url.sql`
- Modify: `server/__tests__/setup.js`

- [ ] **Step 1: Create migration file**

```sql
-- server/db/migrations/005_add_photo_url.sql
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

- [ ] **Step 2: Add migration to test setup**

In `server/__tests__/setup.js`, after the existing `sql4` block (around line 48), add:

```js
  const sql5 = fs.readFileSync(
    path.join(__dirname, '../db/migrations/005_add_photo_url.sql'),
    'utf8'
  )
  await pool.query(sql5)
```

- [ ] **Step 3: Run server tests to confirm nothing broke**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000
npm test --workspace=server
```

Expected: all existing tests pass (green).

- [ ] **Step 4: Commit**

```bash
git add server/db/migrations/005_add_photo_url.sql server/__tests__/setup.js
git commit -m "feat: add photo_url column to workouts (migration 005)"
```

---

## Task 2: PUT /api/workouts/:id/photo endpoint (TDD)

**Files:**
- Modify: `server/__tests__/workouts.test.js`
- Modify: `server/routes/workouts.js`

- [ ] **Step 1: Write three failing tests**

Append to `server/__tests__/workouts.test.js`:

```js
describe('PUT /api/workouts/:id/photo', () => {
  it('sets photo_url on the workout', async () => {
    const { body: workout } = await request(app).post('/api/workouts')
      .set(authHeader(joeToken)).send({ date: '2026-04-22' })
    const res = await request(app).put(`/api/workouts/${workout.id}/photo`)
      .set(authHeader(joeToken))
      .send({ photo_url: 'https://res.cloudinary.com/test/image/upload/v1/photo.jpg' })
    expect(res.status).toBe(200)
    expect(res.body.photo_url).toBe('https://res.cloudinary.com/test/image/upload/v1/photo.jpg')
  })

  it('clears photo_url when null is sent', async () => {
    const { body: workout } = await request(app).post('/api/workouts')
      .set(authHeader(joeToken)).send({ date: '2026-04-22' })
    await request(app).put(`/api/workouts/${workout.id}/photo`)
      .set(authHeader(joeToken))
      .send({ photo_url: 'https://res.cloudinary.com/test/image/upload/v1/photo.jpg' })
    const res = await request(app).put(`/api/workouts/${workout.id}/photo`)
      .set(authHeader(joeToken))
      .send({ photo_url: null })
    expect(res.status).toBe(200)
    expect(res.body.photo_url).toBeNull()
  })

  it('returns 404 for a workout owned by another user', async () => {
    const other = await createUser({ name: 'Other', email: 'other@test.com', password: 'pw' })
    const { body: workout } = await request(app).post('/api/workouts')
      .set(authHeader(other.token)).send({ date: '2026-04-22' })
    const res = await request(app).put(`/api/workouts/${workout.id}/photo`)
      .set(authHeader(joeToken))
      .send({ photo_url: 'https://example.com/photo.jpg' })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test --workspace=server -- --testPathPattern=workouts
```

Expected: 3 failures — "PUT /api/workouts/:id/photo" tests fail with 404 (route does not exist yet).

- [ ] **Step 3: Add the endpoint to workouts.js**

In `server/routes/workouts.js`, after the `PUT /:id` block (after line 204), add:

```js
// PUT /api/workouts/:id/photo
router.put('/:id/photo', async (req, res) => {
  try {
    const { photo_url } = req.body
    const check = await pool.query(
      'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!check.rows[0]) return res.status(404).json({ error: 'Workout not found' })
    await pool.query(
      'UPDATE workouts SET photo_url = $1 WHERE id = $2',
      [photo_url ?? null, req.params.id]
    )
    res.json(await getWorkoutWithSets(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test --workspace=server -- --testPathPattern=workouts
```

Expected: all workouts tests pass including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add server/routes/workouts.js server/__tests__/workouts.test.js
git commit -m "feat: add PUT /api/workouts/:id/photo endpoint"
```

---

## Task 3: Cloudinary upload service

**Files:**
- Create: `client/src/services/cloudinaryService.js`

No unit test for this module — it wraps browser canvas and fetch APIs that are impractical to unit test. It is exercise-tested via the DaySheet integration.

- [ ] **Step 1: Create the service**

```js
// client/src/services/cloudinaryService.js
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

async function resizeImage(file, maxPx = 1200) {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.src = objectUrl
  })
}

export async function uploadToCloudinary(file) {
  const blob = await resizeImage(file)
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  form.append('upload_preset', UPLOAD_PRESET)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  )
  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return data.secure_url
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/services/cloudinaryService.js
git commit -m "feat: add Cloudinary upload service"
```

---

## Task 4: DaySheet photo section (TDD)

**Files:**
- Modify: `client/src/__tests__/DaySheet.test.jsx`
- Modify: `client/src/components/DaySheet.jsx`

- [ ] **Step 1: Write four failing tests**

At the top of `client/src/__tests__/DaySheet.test.jsx`, add mocks after the existing imports:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DaySheet from '../components/DaySheet'

vi.mock('../api/client', () => ({
  api: { put: vi.fn() }
}))

vi.mock('../services/cloudinaryService', () => ({
  uploadToCloudinary: vi.fn()
}))
```

Then import them at the top of the test file (after the mock declarations):

```js
import { api } from '../api/client'
import { uploadToCloudinary } from '../services/cloudinaryService'
```

Add a `beforeEach` to the existing `describe('DaySheet')` block (before the first `it`):

```js
  beforeEach(() => {
    vi.clearAllMocks()
  })
```

Append these four tests inside the existing `describe('DaySheet', () => { ... })` block:

```js
  it('shows dashed upload target when workout has no photo', () => {
    const workoutNoPhoto = { id: 1, notes: 'Push Day', duration_minutes: 45, sets: [], photo_url: null }
    render(
      <DaySheet date="2026-04-21" data={{ workout: workoutNoPhoto }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} onPhotoChange={() => {}} />
    )
    expect(screen.getByText('Add progress photo')).toBeInTheDocument()
  })

  it('shows photo img and Change/Remove buttons when workout has a photo', () => {
    const workoutWithPhoto = { id: 1, notes: 'Push Day', duration_minutes: 45, sets: [], photo_url: 'https://res.cloudinary.com/test/photo.jpg' }
    render(
      <DaySheet date="2026-04-21" data={{ workout: workoutWithPhoto }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} onPhotoChange={() => {}} />
    )
    expect(screen.getByRole('img', { name: /progress photo/i })).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('does not show photo section when there is no workout', () => {
    render(
      <DaySheet date="2026-04-21" data={{ wellness: { id: 1, energy_level: 8, mood: 7, pain_level: 2, sleep_hours: 7, water_oz: 80, creatine_taken: false } }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} onPhotoChange={() => {}} />
    )
    expect(screen.queryByText('Add progress photo')).not.toBeInTheDocument()
  })

  it('calls api.put with null and onPhotoChange when Remove is clicked', async () => {
    api.put.mockResolvedValue({ id: 1, photo_url: null })
    const onPhotoChange = vi.fn()
    const workoutWithPhoto = { id: 1, notes: 'Push Day', duration_minutes: 45, sets: [], photo_url: 'https://res.cloudinary.com/test/photo.jpg' }
    render(
      <DaySheet date="2026-04-21" data={{ workout: workoutWithPhoto }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} onPhotoChange={onPhotoChange} />
    )
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/workouts/1/photo', { photo_url: null })
      expect(onPhotoChange).toHaveBeenCalledWith(1, null)
    })
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/joecoover2022/Downloads/Robo-Trainer-3000
npm test --workspace=client -- --reporter=verbose DaySheet
```

Expected: 4 new tests fail — "Add progress photo", photo img, etc. not in DOM.

- [ ] **Step 3: Update DaySheet.jsx**

Replace the entire file with:

```jsx
// client/src/components/DaySheet.jsx
import { useState, useRef } from 'react'
import { api } from '../api/client'
import { uploadToCloudinary } from '../services/cloudinaryService'

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

export default function DaySheet({ date, data, onClose, onLogWorkout, onLogWellness, onPhotoChange }) {
  const workout = data?.workout
  const wellness = data?.wellness

  // Hooks must come before any early return
  const [photoUrl, setPhotoUrl] = useState(workout?.photo_url ?? null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const fileInputRef = useRef(null)

  if (!date) return null

  const isEmpty = !workout && !wellness
  const exerciseNames = [...new Set((workout?.sets ?? []).map(s => s.exercise_name))]

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setPhotoError(null)
    try {
      const url = await uploadToCloudinary(file)
      const updated = await api.put(`/workouts/${workout.id}/photo`, { photo_url: url })
      setPhotoUrl(updated.photo_url)
      onPhotoChange?.(workout.id, updated.photo_url)
    } catch {
      setPhotoError('Upload failed. Please try again.')
    } finally {
      setPhotoLoading(false)
      e.target.value = ''
    }
  }

  async function handleRemove() {
    setPhotoLoading(true)
    setPhotoError(null)
    try {
      await api.put(`/workouts/${workout.id}/photo`, { photo_url: null })
      setPhotoUrl(null)
      onPhotoChange?.(workout.id, null)
    } catch {
      setPhotoError('Could not remove photo. Please try again.')
    } finally {
      setPhotoLoading(false)
    }
  }

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
                {workout.mobility_sets?.length > 0 && (
                  <div style={{ color: '#4db6f7', fontSize: 12, marginTop: 4 }}>
                    Mobility: {workout.mobility_sets.map(ms => ms.exercise_name).join(' · ')}
                  </div>
                )}
              </div>
            )}

            {workout && (
              <div style={{ marginBottom: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {photoUrl ? (
                  <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <img
                      src={photoUrl}
                      alt="progress photo"
                      style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', gap: 8, padding: 8, background: '#1a1a2e' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoLoading}
                        style={{ flex: 1, padding: 7, background: '#252540', border: 'none', borderRadius: 7, color: '#a090ff', fontSize: 11, cursor: 'pointer' }}
                      >Change</button>
                      <button
                        onClick={handleRemove}
                        disabled={photoLoading}
                        style={{ flex: 1, padding: 7, background: '#252540', border: 'none', borderRadius: 7, color: '#e05555', fontSize: 11, cursor: 'pointer' }}
                      >Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoLoading}
                    style={{ width: '100%', padding: 14, background: 'transparent', border: '1.5px dashed #333', borderRadius: 10, color: '#555', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
                  >
                    📷 {photoLoading ? 'Uploading...' : 'Add progress photo'}
                  </button>
                )}
                {photoError && (
                  <div style={{ fontSize: 11, color: '#e05555', marginTop: 6 }}>{photoError}</div>
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
                  {wellness.water_oz != null && <span>Water {wellness.water_oz > 0 ? '✓' : '✗'} · </span>}
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test --workspace=client -- --reporter=verbose DaySheet
```

Expected: all DaySheet tests pass (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/DaySheet.jsx client/src/__tests__/DaySheet.test.jsx
git commit -m "feat: add photo upload/remove section to DaySheet"
```

---

## Task 5: Photos gallery page (TDD)

**Files:**
- Create: `client/src/__tests__/Photos.test.jsx`
- Create: `client/src/pages/Photos.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/__tests__/Photos.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Photos from '../pages/Photos'

vi.mock('../api/client', () => ({
  api: { get: vi.fn() }
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 1, name: 'Joe', partner_id: 2 } })
}))

import { api } from '../api/client'

const workoutWithPhoto = {
  id: 10,
  date: '2026-04-28',
  notes: 'Push Day',
  photo_url: 'https://res.cloudinary.com/test/image/upload/v1/photo.jpg',
  sets: [],
}

const workoutNoPhoto = {
  id: 11,
  date: '2026-04-25',
  notes: 'Pull Day',
  photo_url: null,
  sets: [],
}

function renderPhotos() {
  return render(
    <MemoryRouter>
      <Photos />
    </MemoryRouter>
  )
}

describe('Photos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no workouts have photos', async () => {
    api.get.mockResolvedValue([])
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByText(/No progress photos yet/i)).toBeInTheDocument()
    })
  })

  it('renders a photo tile for each workout with a photo_url', async () => {
    api.get.mockResolvedValue([workoutWithPhoto, workoutNoPhoto])
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Push Day/i })).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: /Pull Day/i })).not.toBeInTheDocument()
    })
  })

  it('groups photos by month', async () => {
    const marchWorkout = {
      id: 12,
      date: '2026-03-15',
      notes: 'Leg Day',
      photo_url: 'https://res.cloudinary.com/test/image/upload/v1/leg.jpg',
      sets: [],
    }
    api.get.mockResolvedValue([workoutWithPhoto, marchWorkout])
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByText('April 2026')).toBeInTheDocument()
      expect(screen.getByText('March 2026')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test --workspace=client -- --reporter=verbose Photos
```

Expected: 3 failures — Photos module not found.

- [ ] **Step 3: Create Photos.jsx**

```jsx
// client/src/pages/Photos.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthLabel(dateStr) {
  const [year, month] = dateStr.split('T')[0].split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

function thumbnailUrl(url) {
  return url.replace('/upload/', '/upload/w_400,c_fill/')
}

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 },
  monthLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 },
  tile: { borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative' },
  photo: { width: '100%', height: 130, objectFit: 'cover', display: 'block' },
  caption: { padding: '5px 8px', background: '#1a1a2e', fontSize: 11, color: '#888' },
  partnerTag: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#f7a76c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#12121f' },
  empty: { textAlign: 'center', color: '#555', fontSize: 13, paddingTop: 60 },
}

export default function Photos() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState(null)

  useEffect(() => {
    async function load() {
      const myWorkouts = await api.get('/workouts')
      let partnerWorkouts = []
      if (currentUser.partner_id) {
        partnerWorkouts = await api.get('/partner/workouts').catch(() => [])
      }
      const all = [
        ...myWorkouts.map(w => ({ ...w, isPartner: false })),
        ...partnerWorkouts.map(w => ({ ...w, isPartner: true })),
      ]
        .filter(w => w.photo_url)
        .sort((a, b) => b.date.localeCompare(a.date))

      const map = {}
      for (const w of all) {
        const key = monthLabel(w.date)
        if (!map[key]) map[key] = []
        map[key].push(w)
      }
      setGroups(map)
    }
    load()
  }, [])

  if (groups === null) return null

  const keys = Object.keys(groups)

  return (
    <div style={s.page}>
      <div style={s.title}>Progress Photos</div>
      {keys.length === 0 ? (
        <div style={s.empty}>No progress photos yet. Add one from any workout day.</div>
      ) : (
        keys.map(month => (
          <div key={month}>
            <div style={s.monthLabel}>{month}</div>
            <div style={s.grid}>
              {groups[month].map(w => (
                <div
                  key={w.id}
                  style={s.tile}
                  onClick={() => navigate('/', { state: { selectedDate: w.date.split('T')[0] } })}
                >
                  <img
                    src={thumbnailUrl(w.photo_url)}
                    alt={w.notes || 'Workout'}
                    style={s.photo}
                  />
                  {w.isPartner && (
                    <div style={s.partnerTag}>P</div>
                  )}
                  <div style={s.caption}>
                    {w.date.split('T')[0]} · {w.notes || 'Workout'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test --workspace=client -- --reporter=verbose Photos
```

Expected: all 3 Photos tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Photos.jsx client/src/__tests__/Photos.test.jsx
git commit -m "feat: add progress photos gallery page"
```

---

## Task 6: Wire up routing + BottomNav

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/BottomNav.jsx`

- [ ] **Step 1: Add /photos route to App.jsx**

In `client/src/App.jsx`, add the import after the existing page imports:

```js
import Photos from './pages/Photos'
```

Inside `<Routes>` in `ProtectedLayout`, add after the `/stats` route:

```jsx
<Route path="/photos" element={<Photos />} />
```

- [ ] **Step 2: Add Photos tab to BottomNav.jsx**

Replace the `tabs` array in `client/src/components/BottomNav.jsx`:

```js
const tabs = [
  { to: '/', label: 'Home', icon: '▣' },
  { to: '/stats', label: 'Stats', icon: '↗' },
  { to: '/photos', label: 'Photos', icon: '📷' },
  { to: '/partner', label: 'Partner', icon: '⊕' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]
```

The existing render logic splits at index 2 — Home and Stats go left of the FAB, Photos + Partner + Settings go right. No other changes needed.

- [ ] **Step 3: Run full client test suite**

```bash
npm test --workspace=client
```

Expected: all client tests pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.jsx client/src/components/BottomNav.jsx
git commit -m "feat: add /photos route and Photos tab to bottom nav"
```

---

## Task 7: Dashboard reads selectedDate from navigation state

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

When the user taps a photo tile in the gallery, `navigate('/', { state: { selectedDate: '...' } })` is called. Dashboard needs to read that on mount and open the DaySheet for that date.

- [ ] **Step 1: Add useLocation import to Dashboard.jsx**

In `client/src/pages/Dashboard.jsx`, update the react-router-dom import (currently `import { useNavigate } from 'react-router-dom'`):

```js
import { useNavigate, useLocation } from 'react-router-dom'
```

- [ ] **Step 2: Read location.state.selectedDate on mount**

Inside the `Dashboard` function, after the existing `const navigate = useNavigate()` line, add:

```js
const location = useLocation()
```

Then add a new `useEffect` after the existing calendar fetch effect:

```js
  useEffect(() => {
    if (location.state?.selectedDate) {
      setSelectedDate(location.state.selectedDate)
    }
  }, [])
```

- [ ] **Step 3: Pass onPhotoChange to DaySheet in Dashboard**

Find the `<DaySheet>` usage in `Dashboard.jsx`. It currently looks like:

```jsx
<DaySheet
  date={selectedDate}
  data={dayMap[selectedDate]}
  onClose={() => setSelectedDate(null)}
  onLogWorkout={...}
  onLogWellness={...}
/>
```

Add the `onPhotoChange` prop:

```jsx
<DaySheet
  date={selectedDate}
  data={dayMap[selectedDate]}
  onClose={() => setSelectedDate(null)}
  onLogWorkout={...}
  onLogWellness={...}
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
```

- [ ] **Step 4: Run full client test suite**

```bash
npm test --workspace=client
```

Expected: all client tests pass.

- [ ] **Step 5: Run full server test suite**

```bash
npm test --workspace=server
```

Expected: all server tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "feat: open DaySheet for date when navigating from Photos gallery"
```

---

## Verification

End-to-end check after all tasks complete:

1. **Upload:** Log a workout, open the calendar day, tap "Add progress photo", pick an image → photo appears in DaySheet
2. **Persistence:** Close DaySheet, reopen the same day → photo still shows (it's in the DB via Cloudinary URL)
3. **Change/Remove:** Open a day with a photo, tap Change → pick a new image; tap Remove → dashed target returns
4. **Gallery:** Tap the 📷 Photos tab → gallery shows all photos grouped by month
5. **Partner:** If you have a partner with photos, their tiles appear in the gallery with a "P" badge, no edit controls in the DaySheet
6. **Deep link:** Tap a gallery tile → lands on Dashboard with that day's DaySheet open
7. **Run tests:** `npm test` in both workspaces — all green
