# Robo Trainer 3000 — Phase 1: Backend API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and fully test a Node/Express REST API backed by PostgreSQL covering auth, workouts, wellness, partner visibility, stats, and data export.

**Architecture:** Monorepo root with `server/` subdirectory. `app.js` exports the Express app (no `listen`) for testability; `index.js` starts the server. All routes under `/api/`. Auth via JWT. Tests run against a separate test PostgreSQL database using Jest + Supertest.

**Tech Stack:** Node.js, Express, pg, bcryptjs, jsonwebtoken, uuid, Jest, Supertest

**Checkpoint:** Phase 1 is complete when `npm test` in `server/` passes all tests and `npm run dev` starts the API on port 3001.

---

## File Map

```
robo-trainer-3000/
├── package.json                          # root scripts: dev, build
├── .env.example
├── .gitignore
└── server/
    ├── package.json
    ├── index.js                          # starts server on PORT
    ├── app.js                            # Express app, no listen
    ├── db/
    │   ├── pool.js                       # pg Pool singleton
    │   └── migrations/
    │       └── 001_initial_schema.sql
    ├── middleware/
    │   └── auth.js                       # verifyToken middleware
    ├── routes/
    │   ├── auth.js                       # POST /api/auth/*
    │   ├── exercises.js                  # GET/POST /api/exercises
    │   ├── routines.js                   # CRUD /api/routines
    │   ├── workouts.js                   # CRUD /api/workouts + sets
    │   ├── wellness.js                   # CRUD /api/wellness
    │   ├── metrics.js                    # CRUD /api/metrics
    │   ├── partner.js                    # GET /api/partner/*
    │   ├── stats.js                      # GET /api/stats/*
    │   └── export.js                     # GET /api/export
    └── __tests__/
        ├── setup.js                      # global beforeAll/afterAll
        ├── helpers.js                    # createUser(), authHeader()
        ├── auth.test.js
        ├── exercises.test.js
        ├── routines.test.js
        ├── workouts.test.js
        ├── wellness.test.js
        ├── metrics.test.js
        ├── partner.test.js
        ├── stats.test.js
        └── export.test.js
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `.env.example`
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `server/index.js`
- Create: `server/app.js`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "robo-trainer-3000",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "test:server": "cd server && npm test"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgresql://localhost:5432/robo_trainer
TEST_DATABASE_URL=postgresql://localhost:5432/robo_trainer_test
JWT_SECRET=change_me_to_a_long_random_string
PORT=3001
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
dist/
.superpowers/
*.log
```

- [ ] **Step 4: Create `server/package.json`**

```json
{
  "name": "robo-trainer-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js",
    "test": "NODE_ENV=test jest --runInBand --forceExit",
    "migrate": "node db/migrate.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testEnvironment": "node",
    "globalSetup": "./__tests__/setup.js"
  }
}
```

- [ ] **Step 5: Create `server/app.js`**

```js
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const exercisesRoutes = require('./routes/exercises')
const routinesRoutes = require('./routes/routines')
const workoutsRoutes = require('./routes/workouts')
const wellnessRoutes = require('./routes/wellness')
const metricsRoutes = require('./routes/metrics')
const partnerRoutes = require('./routes/partner')
const statsRoutes = require('./routes/stats')
const exportRoutes = require('./routes/export')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/exercises', exercisesRoutes)
app.use('/api/routines', routinesRoutes)
app.use('/api/workouts', workoutsRoutes)
app.use('/api/wellness', wellnessRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/partner', partnerRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/export', exportRoutes)

module.exports = app
```

- [ ] **Step 6: Create `server/index.js`**

```js
require('dotenv').config()
const app = require('./app')

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

- [ ] **Step 7: Install root dependencies**

```bash
cd /path/to/robo-trainer-3000 && npm install
```

- [ ] **Step 8: Install server dependencies**

```bash
cd server && npm install
```

- [ ] **Step 9: Create stub route files so app.js doesn't crash**

Each file at `server/routes/*.js` needs this content until replaced in later tasks. Create all 9 files now:

```js
// auth.js, exercises.js, routines.js, workouts.js,
// wellness.js, metrics.js, partner.js, stats.js, export.js
const express = require('express')
const router = express.Router()
module.exports = router
```

- [ ] **Step 10: Verify app starts without errors**

```bash
cd server && node app.js
```
Expected: no errors. Ctrl+C to stop.

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold — monorepo, server stub, env template"
```

---

## Task 2: Database Schema + Migration

**Files:**
- Create: `server/db/pool.js`
- Create: `server/db/migrations/001_initial_schema.sql`
- Create: `server/db/migrate.js`

- [ ] **Step 1: Create test and development databases**

```bash
createdb robo_trainer
createdb robo_trainer_test
```

- [ ] **Step 2: Create `server/db/pool.js`**

```js
const { Pool } = require('pg')

const connectionString = process.env.NODE_ENV === 'test'
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL

const pool = new Pool({ connectionString })

module.exports = { pool }
```

- [ ] **Step 3: Create `server/db/migrations/001_initial_schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  partner_id INTEGER REFERENCES users(id),
  invite_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  muscle_group VARCHAR(100),
  is_pt_exercise BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routines (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  routine_id INTEGER REFERENCES routines(id),
  notes TEXT,
  duration_minutes INTEGER,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sets (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight_lbs NUMERIC(6,2),
  reps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wellness_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pain_level INTEGER CHECK (pain_level BETWEEN 1 AND 10),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  sleep_hours NUMERIC(4,2),
  water_oz INTEGER,
  creatine_taken BOOLEAN DEFAULT FALSE,
  pain_areas TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Seed global exercises
INSERT INTO exercises (name, muscle_group, is_pt_exercise) VALUES
  ('Bench Press', 'chest', false),
  ('Squat', 'legs', false),
  ('Deadlift', 'back', false),
  ('Overhead Press', 'shoulders', false),
  ('Barbell Row', 'back', false),
  ('Pull-Up', 'back', false),
  ('Dumbbell Curl', 'biceps', false),
  ('Tricep Pushdown', 'triceps', false),
  ('Leg Press', 'legs', false),
  ('Romanian Deadlift', 'hamstrings', false),
  ('Hip Thrust', 'glutes', false),
  ('Lat Pulldown', 'back', false),
  ('Cable Row', 'back', false),
  ('Dumbbell Lateral Raise', 'shoulders', false),
  ('Clamshell', 'glutes', true),
  ('Bird Dog', 'core', true),
  ('Dead Bug', 'core', true),
  ('Monster Walk', 'glutes', true),
  ('Glute Bridge', 'glutes', true),
  ('Pallof Press', 'core', true)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 4: Create `server/db/migrate.js`**

```js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('./pool')

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_initial_schema.sql'),
    'utf8'
  )
  await pool.query(sql)
  console.log('Migration complete')
  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 5: Run migration on both databases**

```bash
cd server
DATABASE_URL=postgresql://localhost:5432/robo_trainer node db/migrate.js
TEST_DATABASE_URL=postgresql://localhost:5432/robo_trainer_test DATABASE_URL=postgresql://localhost:5432/robo_trainer_test NODE_ENV=test node db/migrate.js
```

Expected: `Migration complete` twice.

- [ ] **Step 6: Commit**

```bash
git add server/db/
git commit -m "feat: database schema and migration script"
```

---

## Task 3: Auth Middleware + Test Helpers

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/__tests__/setup.js`
- Create: `server/__tests__/helpers.js`

- [ ] **Step 1: Create `server/middleware/auth.js`**

```js
const jwt = require('jsonwebtoken')

function verifyToken(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }
  const token = header.slice(7)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { verifyToken }
```

- [ ] **Step 2: Create `server/__tests__/setup.js`**

```js
const path = require('path')
const fs = require('fs')

module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test'
  process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ||
    'postgresql://localhost:5432/robo_trainer_test'
  process.env.JWT_SECRET = 'test_jwt_secret'

  const { Pool } = require('pg')
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })

  // Drop and recreate all tables cleanly
  await pool.query(`
    DROP TABLE IF EXISTS sets CASCADE;
    DROP TABLE IF EXISTS workouts CASCADE;
    DROP TABLE IF EXISTS wellness_logs CASCADE;
    DROP TABLE IF EXISTS body_metrics CASCADE;
    DROP TABLE IF EXISTS routine_exercises CASCADE;
    DROP TABLE IF EXISTS routines CASCADE;
    DROP TABLE IF EXISTS exercises CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `)

  const sql = fs.readFileSync(
    path.join(__dirname, '../db/migrations/001_initial_schema.sql'),
    'utf8'
  )
  await pool.query(sql)
  await pool.end()
}
```

- [ ] **Step 3: Create `server/__tests__/helpers.js`**

```js
const request = require('supertest')
const app = require('../app')

async function createUser({ name = 'Joe', email = 'joe@test.com', password = 'password123' } = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password })
  return res.body // { token, user }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

module.exports = { createUser, authHeader }
```

- [ ] **Step 4: Create `server/__tests__/auth.test.js` (failing — routes not implemented yet)**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')

beforeEach(async () => {
  await pool.query('DELETE FROM users')
})

afterAll(async () => {
  await pool.end()
})

describe('POST /api/auth/register', () => {
  it('creates a user and returns token + user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Joe', email: 'joe@test.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('joe@test.com')
    expect(res.body.user.password_hash).toBeUndefined()
  })

  it('returns 409 if email already registered', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Joe', email: 'joe@test.com', password: 'password123' })
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Joe2', email: 'joe@test.com', password: 'other' })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  it('returns token for valid credentials', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Joe', email: 'joe@test.com', password: 'password123' })
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'joe@test.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Joe', email: 'joe@test.com', password: 'password123' })
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'joe@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/invite', () => {
  it('generates an invite token for the logged-in user', async () => {
    const { token } = (await request(app).post('/api/auth/register')
      .send({ name: 'Joe', email: 'joe@test.com', password: 'password123' })).body
    const res = await request(app).post('/api/auth/invite')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.inviteUrl).toMatch(/accept-invite\?token=/)
  })
})

describe('POST /api/auth/accept-invite', () => {
  it('registers Sydney and links her to Joe', async () => {
    const { token: joeToken } = (await request(app).post('/api/auth/register')
      .send({ name: 'Joe', email: 'joe@test.com', password: 'password123' })).body
    const { inviteUrl } = (await request(app).post('/api/auth/invite')
      .set('Authorization', `Bearer ${joeToken}`)).body
    const inviteToken = new URL(inviteUrl).searchParams.get('token')

    const res = await request(app).post('/api/auth/accept-invite')
      .send({ name: 'Sydney', email: 'sydney@test.com', password: 'password123', inviteToken })
    expect(res.status).toBe(201)
    expect(res.body.user.partner_id).toBeDefined()
  })
})
```

- [ ] **Step 5: Run tests to confirm they fail**

```bash
cd server && npm test -- --testPathPattern=auth
```

Expected: FAIL — routes not implemented.

- [ ] **Step 6: Commit test + helpers**

```bash
git add server/__tests__/ server/middleware/
git commit -m "test: auth tests + test helpers (failing — implementation pending)"
```

---

## Task 4: Auth Routes

**Files:**
- Modify: `server/routes/auth.js`

- [ ] **Step 1: Implement `server/routes/auth.js`**

```js
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  try {
    const password_hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, partner_id, created_at',
      [name, email, password_hash]
    )
    const user = result.rows[0]
    res.status(201).json({ token: makeToken(user), user })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const { password_hash, invite_token, ...safeUser } = user
    res.json({ token: makeToken(safeUser), user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/invite  (requires auth)
router.post('/invite', verifyToken, async (req, res) => {
  const token = uuidv4()
  await pool.query('UPDATE users SET invite_token = $1 WHERE id = $2', [token, req.user.id])
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  res.json({ inviteUrl: `${baseUrl}/accept-invite?token=${token}` })
})

// POST /api/auth/accept-invite
router.post('/accept-invite', async (req, res) => {
  const { name, email, password, inviteToken } = req.body
  if (!name || !email || !password || !inviteToken) {
    return res.status(400).json({ error: 'name, email, password, and inviteToken are required' })
  }
  try {
    const inviterResult = await pool.query(
      'SELECT * FROM users WHERE invite_token = $1', [inviteToken]
    )
    const inviter = inviterResult.rows[0]
    if (!inviter) return res.status(404).json({ error: 'Invalid or expired invite token' })

    const password_hash = await bcrypt.hash(password, 10)
    const newUserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, partner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, partner_id, created_at',
      [name, email, password_hash, inviter.id]
    )
    const newUser = newUserResult.rows[0]

    // Link inviter to new user + clear token
    await pool.query(
      'UPDATE users SET partner_id = $1, invite_token = NULL WHERE id = $2',
      [newUser.id, inviter.id]
    )

    res.status(201).json({ token: makeToken(newUser), user: newUser })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me  (requires auth)
router.get('/me', verifyToken, async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, partner_id, created_at FROM users WHERE id = $1',
    [req.user.id]
  )
  res.json(result.rows[0])
})

module.exports = router
```

- [ ] **Step 2: Run auth tests**

```bash
cd server && npm test -- --testPathPattern=auth
```

Expected: all 6 auth tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/routes/auth.js
git commit -m "feat: auth routes — register, login, invite, accept-invite"
```

---

## Task 5: Exercises + Routines Routes

**Files:**
- Modify: `server/routes/exercises.js`
- Modify: `server/routes/routines.js`
- Create: `server/__tests__/exercises.test.js`
- Create: `server/__tests__/routines.test.js`

- [ ] **Step 1: Write `server/__tests__/exercises.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joe, token

beforeEach(async () => {
  await pool.query('DELETE FROM users')
  const data = await createUser()
  joe = data.user
  token = data.token
})

afterAll(() => pool.end())

describe('GET /api/exercises', () => {
  it('returns seeded global exercises', async () => {
    const res = await request(app).get('/api/exercises').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('name')
  })
})

describe('POST /api/exercises', () => {
  it('creates a custom exercise for the user', async () => {
    const res = await request(app).post('/api/exercises')
      .set(authHeader(token))
      .send({ name: 'Nordic Curl', muscle_group: 'hamstrings', is_pt_exercise: false })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Nordic Curl')
    expect(res.body.created_by).toBe(joe.id)
  })

  it('returns 400 if name is missing', async () => {
    const res = await request(app).post('/api/exercises')
      .set(authHeader(token))
      .send({ muscle_group: 'hamstrings' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd server && npm test -- --testPathPattern=exercises
```

Expected: FAIL.

- [ ] **Step 3: Implement `server/routes/exercises.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/exercises — global + user's custom
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM exercises WHERE created_by IS NULL OR created_by = $1 ORDER BY name',
    [req.user.id]
  )
  res.json(result.rows)
})

// POST /api/exercises — create custom exercise
router.post('/', async (req, res) => {
  const { name, muscle_group, is_pt_exercise = false } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const result = await pool.query(
    'INSERT INTO exercises (name, muscle_group, is_pt_exercise, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, muscle_group || null, is_pt_exercise, req.user.id]
  )
  res.status(201).json(result.rows[0])
})

module.exports = router
```

- [ ] **Step 4: Run exercises tests**

```bash
cd server && npm test -- --testPathPattern=exercises
```

Expected: all pass.

- [ ] **Step 5: Write `server/__tests__/routines.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token, exerciseId

beforeEach(async () => {
  await pool.query('DELETE FROM routine_exercises; DELETE FROM routines; DELETE FROM users')
  const data = await createUser()
  token = data.token
  const ex = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = ex.rows[0].id
})

afterAll(() => pool.end())

describe('POST /api/routines', () => {
  it('creates a routine with exercises', async () => {
    const res = await request(app).post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Push Day', exerciseIds: [exerciseId] })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Push Day')
    expect(res.body.exercises).toHaveLength(1)
  })
})

describe('GET /api/routines', () => {
  it('returns the user\'s routines', async () => {
    await request(app).post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Push Day', exerciseIds: [] })
    const res = await request(app).get('/api/routines').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('DELETE /api/routines/:id', () => {
  it('deletes a routine', async () => {
    const { body: routine } = await request(app).post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Push Day', exerciseIds: [] })
    const res = await request(app).delete(`/api/routines/${routine.id}`).set(authHeader(token))
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 6: Implement `server/routes/routines.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getRoutineWithExercises(routineId) {
  const routine = (await pool.query('SELECT * FROM routines WHERE id = $1', [routineId])).rows[0]
  if (!routine) return null
  const exercises = (await pool.query(
    `SELECT e.*, re.sort_order FROM exercises e
     JOIN routine_exercises re ON re.exercise_id = e.id
     WHERE re.routine_id = $1 ORDER BY re.sort_order`,
    [routineId]
  )).rows
  return { ...routine, exercises }
}

// GET /api/routines
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM routines WHERE user_id = $1 ORDER BY name',
    [req.user.id]
  )
  const routines = await Promise.all(result.rows.map(r => getRoutineWithExercises(r.id)))
  res.json(routines)
})

// POST /api/routines
router.post('/', async (req, res) => {
  const { name, exerciseIds = [] } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const { rows } = await pool.query(
    'INSERT INTO routines (user_id, name) VALUES ($1, $2) RETURNING *',
    [req.user.id, name]
  )
  const routine = rows[0]
  for (let i = 0; i < exerciseIds.length; i++) {
    await pool.query(
      'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
      [routine.id, exerciseIds[i], i]
    )
  }
  res.status(201).json(await getRoutineWithExercises(routine.id))
})

// PUT /api/routines/:id
router.put('/:id', async (req, res) => {
  const { name, exerciseIds } = req.body
  const routine = (await pool.query(
    'SELECT * FROM routines WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
  )).rows[0]
  if (!routine) return res.status(404).json({ error: 'Routine not found' })
  if (name) await pool.query('UPDATE routines SET name = $1 WHERE id = $2', [name, routine.id])
  if (exerciseIds) {
    await pool.query('DELETE FROM routine_exercises WHERE routine_id = $1', [routine.id])
    for (let i = 0; i < exerciseIds.length; i++) {
      await pool.query(
        'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
        [routine.id, exerciseIds[i], i]
      )
    }
  }
  res.json(await getRoutineWithExercises(routine.id))
})

// DELETE /api/routines/:id
router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM routines WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  )
  if (!result.rows[0]) return res.status(404).json({ error: 'Routine not found' })
  res.status(204).send()
})

module.exports = router
```

- [ ] **Step 7: Run routines tests**

```bash
cd server && npm test -- --testPathPattern=routines
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add server/routes/exercises.js server/routes/routines.js server/__tests__/
git commit -m "feat: exercises and routines routes with tests"
```

---

## Task 6: Workouts + Sets Routes

**Files:**
- Modify: `server/routes/workouts.js`
- Create: `server/__tests__/workouts.test.js`

- [ ] **Step 1: Write `server/__tests__/workouts.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joeToken, joeId, exerciseId

beforeEach(async () => {
  await pool.query('DELETE FROM sets; DELETE FROM workouts; DELETE FROM users')
  const data = await createUser({ name: 'Joe', email: 'joe@test.com', password: 'pw' })
  joeToken = data.token
  joeId = data.user.id
  const ex = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = ex.rows[0].id
})

afterAll(() => pool.end())

describe('POST /api/workouts', () => {
  it('creates a solo workout', async () => {
    const res = await request(app).post('/api/workouts')
      .set(authHeader(joeToken))
      .send({ date: '2026-04-22', notes: 'Felt strong', is_shared: false })
    expect(res.status).toBe(201)
    expect(res.body.user_id).toBe(joeId)
    expect(res.body.sets).toEqual([])
  })
})

describe('POST /api/workouts/:id/sets', () => {
  it('adds a set to a workout', async () => {
    const { body: workout } = await request(app).post('/api/workouts')
      .set(authHeader(joeToken))
      .send({ date: '2026-04-22' })
    const res = await request(app).post(`/api/workouts/${workout.id}/sets`)
      .set(authHeader(joeToken))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 185, reps: 5 })
    expect(res.status).toBe(201)
    expect(res.body.weight_lbs).toBe('185.00')
    expect(res.body.reps).toBe(5)
  })
})

describe('GET /api/workouts', () => {
  it('returns user workouts with sets', async () => {
    const { body: workout } = await request(app).post('/api/workouts')
      .set(authHeader(joeToken)).send({ date: '2026-04-22' })
    await request(app).post(`/api/workouts/${workout.id}/sets`)
      .set(authHeader(joeToken))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 185, reps: 5 })
    const res = await request(app).get('/api/workouts').set(authHeader(joeToken))
    expect(res.status).toBe(200)
    expect(res.body[0].sets).toHaveLength(1)
  })
})

describe('PUT /api/workouts/sets/:id', () => {
  it('updates a set', async () => {
    const { body: workout } = await request(app).post('/api/workouts')
      .set(authHeader(joeToken)).send({ date: '2026-04-22' })
    const { body: set } = await request(app).post(`/api/workouts/${workout.id}/sets`)
      .set(authHeader(joeToken))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 185, reps: 5 })
    const res = await request(app).put(`/api/workouts/sets/${set.id}`)
      .set(authHeader(joeToken))
      .send({ weight_lbs: 195, reps: 4 })
    expect(res.status).toBe(200)
    expect(res.body.weight_lbs).toBe('195.00')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd server && npm test -- --testPathPattern=workouts
```

Expected: FAIL.

- [ ] **Step 3: Implement `server/routes/workouts.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getWorkoutWithSets(workoutId) {
  const workout = (await pool.query('SELECT * FROM workouts WHERE id = $1', [workoutId])).rows[0]
  if (!workout) return null
  const sets = (await pool.query(
    `SELECT s.*, e.name as exercise_name, e.muscle_group
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_id = $1 ORDER BY s.set_number`,
    [workoutId]
  )).rows
  return { ...workout, sets }
}

// GET /api/workouts
router.get('/', async (req, res) => {
  const { start, end } = req.query
  let query = 'SELECT * FROM workouts WHERE user_id = $1'
  const params = [req.user.id]
  if (start) { params.push(start); query += ` AND date >= $${params.length}` }
  if (end) { params.push(end); query += ` AND date <= $${params.length}` }
  query += ' ORDER BY date DESC'
  const result = await pool.query(query, params)
  const workouts = await Promise.all(result.rows.map(w => getWorkoutWithSets(w.id)))
  res.json(workouts)
})

// GET /api/workouts/:id
router.get('/:id', async (req, res) => {
  const workout = await getWorkoutWithSets(req.params.id)
  if (!workout || workout.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Workout not found' })
  }
  res.json(workout)
})

// POST /api/workouts
router.post('/', async (req, res) => {
  const { date, routine_id, notes, duration_minutes, is_shared = false } = req.body
  const result = await pool.query(
    `INSERT INTO workouts (user_id, date, routine_id, notes, duration_minutes, is_shared)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, date || new Date().toISOString().split('T')[0],
     routine_id || null, notes || null, duration_minutes || null, is_shared]
  )
  res.status(201).json({ ...result.rows[0], sets: [] })
})

// PUT /api/workouts/:id
router.put('/:id', async (req, res) => {
  const { notes, duration_minutes } = req.body
  const result = await pool.query(
    `UPDATE workouts SET notes = COALESCE($1, notes),
     duration_minutes = COALESCE($2, duration_minutes)
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [notes, duration_minutes, req.params.id, req.user.id]
  )
  if (!result.rows[0]) return res.status(404).json({ error: 'Workout not found' })
  res.json(await getWorkoutWithSets(result.rows[0].id))
})

// DELETE /api/workouts/:id
router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  )
  if (!result.rows[0]) return res.status(404).json({ error: 'Workout not found' })
  res.status(204).send()
})

// POST /api/workouts/:id/sets
router.post('/:id/sets', async (req, res) => {
  const { exercise_id, set_number, weight_lbs, reps } = req.body
  if (!exercise_id || set_number == null) {
    return res.status(400).json({ error: 'exercise_id and set_number are required' })
  }
  const workout = (await pool.query(
    'SELECT * FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
  )).rows[0]
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  const result = await pool.query(
    'INSERT INTO sets (workout_id, exercise_id, set_number, weight_lbs, reps) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [workout.id, exercise_id, set_number, weight_lbs || null, reps || null]
  )
  res.status(201).json(result.rows[0])
})

// PUT /api/sets/:id
router.put('/sets/:id', async (req, res) => {
  const { weight_lbs, reps } = req.body
  // Verify the set belongs to a workout owned by this user
  const check = await pool.query(
    `SELECT s.id FROM sets s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.id = $1 AND w.user_id = $2`,
    [req.params.id, req.user.id]
  )
  if (!check.rows[0]) return res.status(404).json({ error: 'Set not found' })
  const result = await pool.query(
    `UPDATE sets SET weight_lbs = COALESCE($1, weight_lbs), reps = COALESCE($2, reps)
     WHERE id = $3 RETURNING *`,
    [weight_lbs, reps, req.params.id]
  )
  res.json(result.rows[0])
})

// DELETE /api/sets/:id
router.delete('/sets/:id', async (req, res) => {
  const check = await pool.query(
    `SELECT s.id FROM sets s JOIN workouts w ON w.id = s.workout_id
     WHERE s.id = $1 AND w.user_id = $2`,
    [req.params.id, req.user.id]
  )
  if (!check.rows[0]) return res.status(404).json({ error: 'Set not found' })
  await pool.query('DELETE FROM sets WHERE id = $1', [req.params.id])
  res.status(204).send()
})

module.exports = router
```

- [ ] **Step 4: Run workouts tests**

```bash
cd server && npm test -- --testPathPattern=workouts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/routes/workouts.js server/__tests__/workouts.test.js
git commit -m "feat: workouts and sets routes with tests"
```

---

## Task 7: Wellness + Metrics Routes

**Files:**
- Modify: `server/routes/wellness.js`
- Modify: `server/routes/metrics.js`
- Create: `server/__tests__/wellness.test.js`
- Create: `server/__tests__/metrics.test.js`

- [ ] **Step 1: Write `server/__tests__/wellness.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token

beforeEach(async () => {
  await pool.query('DELETE FROM wellness_logs; DELETE FROM users')
  const data = await createUser()
  token = data.token
})

afterAll(() => pool.end())

describe('POST /api/wellness', () => {
  it('creates a wellness log', async () => {
    const res = await request(app).post('/api/wellness')
      .set(authHeader(token))
      .send({
        date: '2026-04-22',
        pain_level: 4,
        energy_level: 7,
        mood: 6,
        sleep_hours: 7.5,
        water_oz: 80,
        creatine_taken: true,
        pain_areas: ['knee'],
        notes: 'Knee a bit stiff'
      })
    expect(res.status).toBe(201)
    expect(res.body.pain_level).toBe(4)
    expect(res.body.pain_areas).toContain('knee')
  })

  it('upserts if log already exists for that date', async () => {
    await request(app).post('/api/wellness')
      .set(authHeader(token)).send({ date: '2026-04-22', pain_level: 4 })
    const res = await request(app).post('/api/wellness')
      .set(authHeader(token)).send({ date: '2026-04-22', pain_level: 7 })
    expect(res.status).toBe(200)
    expect(res.body.pain_level).toBe(7)
  })
})

describe('GET /api/wellness', () => {
  it('returns wellness logs for the user', async () => {
    await request(app).post('/api/wellness')
      .set(authHeader(token)).send({ date: '2026-04-22', pain_level: 4 })
    const res = await request(app).get('/api/wellness').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Implement `server/routes/wellness.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/wellness
router.get('/', async (req, res) => {
  const { start, end } = req.query
  let query = 'SELECT * FROM wellness_logs WHERE user_id = $1'
  const params = [req.user.id]
  if (start) { params.push(start); query += ` AND date >= $${params.length}` }
  if (end) { params.push(end); query += ` AND date <= $${params.length}` }
  query += ' ORDER BY date DESC'
  const result = await pool.query(query, params)
  res.json(result.rows)
})

// POST /api/wellness — upsert by (user_id, date)
router.post('/', async (req, res) => {
  const { date, pain_level, energy_level, mood, sleep_hours, water_oz,
          creatine_taken, pain_areas, notes } = req.body
  const logDate = date || new Date().toISOString().split('T')[0]
  const result = await pool.query(
    `INSERT INTO wellness_logs
       (user_id, date, pain_level, energy_level, mood, sleep_hours, water_oz, creatine_taken, pain_areas, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id, date) DO UPDATE SET
       pain_level = EXCLUDED.pain_level,
       energy_level = EXCLUDED.energy_level,
       mood = EXCLUDED.mood,
       sleep_hours = EXCLUDED.sleep_hours,
       water_oz = EXCLUDED.water_oz,
       creatine_taken = EXCLUDED.creatine_taken,
       pain_areas = EXCLUDED.pain_areas,
       notes = EXCLUDED.notes
     RETURNING *, (xmax = 0) AS inserted`,
    [req.user.id, logDate, pain_level||null, energy_level||null, mood||null,
     sleep_hours||null, water_oz||null, creatine_taken||false, pain_areas||[], notes||null]
  )
  const row = result.rows[0]
  const status = row.inserted ? 201 : 200
  res.status(status).json(row)
})

// GET /api/wellness/today
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const result = await pool.query(
    'SELECT * FROM wellness_logs WHERE user_id = $1 AND date = $2',
    [req.user.id, today]
  )
  res.json(result.rows[0] || null)
})

module.exports = router
```

- [ ] **Step 3: Write `server/__tests__/metrics.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token

beforeEach(async () => {
  await pool.query('DELETE FROM body_metrics; DELETE FROM users')
  const data = await createUser()
  token = data.token
})

afterAll(() => pool.end())

describe('POST /api/metrics', () => {
  it('logs body weight', async () => {
    const res = await request(app).post('/api/metrics')
      .set(authHeader(token))
      .send({ date: '2026-04-22', weight_lbs: 185.5 })
    expect(res.status).toBe(201)
    expect(res.body.weight_lbs).toBe('185.50')
  })
})

describe('GET /api/metrics', () => {
  it('returns metrics for the user', async () => {
    await request(app).post('/api/metrics')
      .set(authHeader(token)).send({ date: '2026-04-22', weight_lbs: 185.5 })
    const res = await request(app).get('/api/metrics').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})
```

- [ ] **Step 4: Implement `server/routes/metrics.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM body_metrics WHERE user_id = $1 ORDER BY date DESC',
    [req.user.id]
  )
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const { date, weight_lbs, notes } = req.body
  const logDate = date || new Date().toISOString().split('T')[0]
  const result = await pool.query(
    `INSERT INTO body_metrics (user_id, date, weight_lbs, notes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, date) DO UPDATE SET
       weight_lbs = EXCLUDED.weight_lbs, notes = EXCLUDED.notes
     RETURNING *, (xmax = 0) AS inserted`,
    [req.user.id, logDate, weight_lbs||null, notes||null]
  )
  const row = result.rows[0]
  res.status(row.inserted ? 201 : 200).json(row)
})

module.exports = router
```

- [ ] **Step 5: Run wellness + metrics tests**

```bash
cd server && npm test -- --testPathPattern="wellness|metrics"
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add server/routes/wellness.js server/routes/metrics.js server/__tests__/
git commit -m "feat: wellness and body metrics routes with tests"
```

---

## Task 8: Partner, Stats + Export Routes

**Files:**
- Modify: `server/routes/partner.js`
- Modify: `server/routes/stats.js`
- Modify: `server/routes/export.js`
- Create: `server/__tests__/partner.test.js`
- Create: `server/__tests__/stats.test.js`
- Create: `server/__tests__/export.test.js`

- [ ] **Step 1: Write `server/__tests__/partner.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joeToken, sydToken

beforeEach(async () => {
  await pool.query('DELETE FROM sets; DELETE FROM workouts; DELETE FROM wellness_logs; DELETE FROM users')
  const joe = await createUser({ name: 'Joe', email: 'joe@test.com', password: 'pw' })
  joeToken = joe.token

  // Joe creates an invite, Sydney accepts
  const { body: { inviteUrl } } = await request(app)
    .post('/api/auth/invite').set(authHeader(joeToken))
  const inviteToken = new URL(inviteUrl).searchParams.get('token')
  const syd = await request(app).post('/api/auth/accept-invite')
    .send({ name: 'Sydney', email: 'sydney@test.com', password: 'pw', inviteToken })
  sydToken = syd.body.token
})

afterAll(() => pool.end())

describe('GET /api/partner/workouts', () => {
  it("returns Sydney's workouts when Joe requests", async () => {
    await request(app).post('/api/workouts')
      .set(authHeader(sydToken)).send({ date: '2026-04-22' })
    const res = await request(app).get('/api/partner/workouts').set(authHeader(joeToken))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /api/partner/wellness', () => {
  it("returns Sydney's wellness logs when Joe requests", async () => {
    await request(app).post('/api/wellness')
      .set(authHeader(sydToken)).send({ date: '2026-04-22', pain_level: 3 })
    const res = await request(app).get('/api/partner/wellness').set(authHeader(joeToken))
    expect(res.status).toBe(200)
    expect(res.body[0].pain_level).toBe(3)
  })
})

describe('GET /api/partner/profile', () => {
  it("returns Sydney's profile info", async () => {
    const res = await request(app).get('/api/partner/profile').set(authHeader(joeToken))
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Sydney')
  })
})
```

- [ ] **Step 2: Implement `server/routes/partner.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getPartnerId(userId) {
  const result = await pool.query('SELECT partner_id FROM users WHERE id = $1', [userId])
  return result.rows[0]?.partner_id || null
}

router.get('/profile', async (req, res) => {
  const partnerId = await getPartnerId(req.user.id)
  if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
  const result = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1', [partnerId]
  )
  res.json(result.rows[0])
})

router.get('/workouts', async (req, res) => {
  const partnerId = await getPartnerId(req.user.id)
  if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
  const workouts = await pool.query(
    'SELECT * FROM workouts WHERE user_id = $1 ORDER BY date DESC', [partnerId]
  )
  const withSets = await Promise.all(workouts.rows.map(async w => {
    const sets = (await pool.query(
      `SELECT s.*, e.name as exercise_name FROM sets s
       JOIN exercises e ON e.id = s.exercise_id WHERE s.workout_id = $1 ORDER BY s.set_number`,
      [w.id]
    )).rows
    return { ...w, sets }
  }))
  res.json(withSets)
})

router.get('/wellness', async (req, res) => {
  const partnerId = await getPartnerId(req.user.id)
  if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
  const result = await pool.query(
    'SELECT * FROM wellness_logs WHERE user_id = $1 ORDER BY date DESC', [partnerId]
  )
  res.json(result.rows)
})

router.get('/metrics', async (req, res) => {
  const partnerId = await getPartnerId(req.user.id)
  if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
  const result = await pool.query(
    'SELECT * FROM body_metrics WHERE user_id = $1 ORDER BY date DESC', [partnerId]
  )
  res.json(result.rows)
})

module.exports = router
```

- [ ] **Step 3: Write `server/__tests__/stats.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token, exerciseId

beforeEach(async () => {
  await pool.query('DELETE FROM sets; DELETE FROM workouts; DELETE FROM users')
  const data = await createUser()
  token = data.token
  const ex = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = ex.rows[0].id

  // Create 2 workouts with increasing weight — second should be a PR
  const w1 = (await request(app).post('/api/workouts')
    .set(authHeader(token)).send({ date: '2026-04-15' })).body
  await request(app).post(`/api/workouts/${w1.id}/sets`)
    .set(authHeader(token)).send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 175, reps: 5 })

  const w2 = (await request(app).post('/api/workouts')
    .set(authHeader(token)).send({ date: '2026-04-22' })).body
  await request(app).post(`/api/workouts/${w2.id}/sets`)
    .set(authHeader(token)).send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 185, reps: 5 })
})

afterAll(() => pool.end())

describe('GET /api/stats/prs', () => {
  it('returns current PR per exercise', async () => {
    const res = await request(app).get('/api/stats/prs').set(authHeader(token))
    expect(res.status).toBe(200)
    const benchPR = res.body.find(p => p.exercise_id === exerciseId)
    expect(Number(benchPR.max_weight_lbs)).toBe(185)
  })
})

describe('GET /api/stats/strength/:exerciseId', () => {
  it('returns strength history for an exercise', async () => {
    const res = await request(app)
      .get(`/api/stats/strength/${exerciseId}`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(Number(res.body[0].max_weight_lbs)).toBe(175)
  })
})

describe('GET /api/stats/consistency', () => {
  it('returns workout dates and current streak', async () => {
    const res = await request(app).get('/api/stats/consistency').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.workout_dates).toHaveLength(2)
    expect(res.body).toHaveProperty('current_streak')
    expect(res.body).toHaveProperty('longest_streak')
    expect(res.body).toHaveProperty('total_workouts')
  })
})
```

- [ ] **Step 4: Implement `server/routes/stats.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/stats/prs — max weight per exercise
router.get('/prs', async (req, res) => {
  const result = await pool.query(
    `SELECT s.exercise_id, e.name as exercise_name, MAX(s.weight_lbs) as max_weight_lbs,
            w.date as pr_date
     FROM sets s
     JOIN workouts w ON w.id = s.workout_id
     JOIN exercises e ON e.id = s.exercise_id
     WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL
     GROUP BY s.exercise_id, e.name, w.date
     ORDER BY e.name`,
    [req.user.id]
  )
  // Return only the best row per exercise
  const byExercise = {}
  for (const row of result.rows) {
    if (!byExercise[row.exercise_id] ||
        Number(row.max_weight_lbs) > Number(byExercise[row.exercise_id].max_weight_lbs)) {
      byExercise[row.exercise_id] = row
    }
  }
  res.json(Object.values(byExercise))
})

// GET /api/stats/strength/:exerciseId — per-workout max weight over time
router.get('/strength/:exerciseId', async (req, res) => {
  const result = await pool.query(
    `SELECT w.date, MAX(s.weight_lbs) as max_weight_lbs, SUM(s.reps) as total_reps
     FROM sets s
     JOIN workouts w ON w.id = s.workout_id
     WHERE w.user_id = $1 AND s.exercise_id = $2 AND s.weight_lbs IS NOT NULL
     GROUP BY w.date ORDER BY w.date ASC`,
    [req.user.id, req.params.exerciseId]
  )
  res.json(result.rows)
})

// GET /api/stats/consistency — streak + calendar data
router.get('/consistency', async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT date FROM workouts WHERE user_id = $1 ORDER BY date ASC`,
    [req.user.id]
  )
  const dates = result.rows.map(r => r.date.toISOString().split('T')[0])
  const total_workouts = dates.length

  // Calculate streaks
  let current_streak = 0
  let longest_streak = 0
  let temp = 0
  const today = new Date().toISOString().split('T')[0]
  const dateSet = new Set(dates)

  // Current streak: count backwards from today (grace: if today has no workout, start from yesterday)
  let check = new Date()
  const todayStr = check.toISOString().split('T')[0]
  if (!dateSet.has(todayStr)) check.setDate(check.getDate() - 1)
  while (true) {
    const d = check.toISOString().split('T')[0]
    if (dateSet.has(d)) {
      current_streak++
      check.setDate(check.getDate() - 1)
    } else {
      break
    }
  }

  // Longest streak
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { temp = 1; continue }
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    temp = diff === 1 ? temp + 1 : 1
    if (temp > longest_streak) longest_streak = temp
  }
  if (temp > longest_streak) longest_streak = temp

  res.json({ workout_dates: dates, current_streak, longest_streak, total_workouts })
})

// GET /api/stats/health — pain + energy over time
router.get('/health', async (req, res) => {
  const { start, end } = req.query
  let query = `SELECT date, pain_level, energy_level, mood, sleep_hours
               FROM wellness_logs WHERE user_id = $1`
  const params = [req.user.id]
  if (start) { params.push(start); query += ` AND date >= $${params.length}` }
  if (end) { params.push(end); query += ` AND date <= $${params.length}` }
  query += ' ORDER BY date ASC'
  const result = await pool.query(query, params)
  res.json(result.rows)
})

module.exports = router
```

- [ ] **Step 5: Write `server/__tests__/export.test.js`**

```js
const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token

beforeEach(async () => {
  await pool.query('DELETE FROM wellness_logs; DELETE FROM sets; DELETE FROM workouts; DELETE FROM users')
  const data = await createUser()
  token = data.token
  await request(app).post('/api/wellness')
    .set(authHeader(token)).send({ date: '2026-04-22', pain_level: 4, energy_level: 7 })
})

afterAll(() => pool.end())

describe('GET /api/export', () => {
  it('returns CSV with wellness data', async () => {
    const res = await request(app)
      .get('/api/export?format=csv&start=2026-04-01&end=2026-04-30')
      .set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.text).toContain('date,pain_level,energy_level')
    expect(res.text).toContain('2026-04-22')
  })

  it('returns JSON by default', async () => {
    const res = await request(app)
      .get('/api/export')
      .set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('wellness')
    expect(res.body).toHaveProperty('workouts')
  })
})
```

- [ ] **Step 6: Implement `server/routes/export.js`**

```js
const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  const { format = 'json', start, end } = req.query
  const dateFilter = (col) => {
    const clauses = []
    const params = []
    if (start) { params.push(start); clauses.push(`${col} >= $${params.length + 1}`) }
    if (end) { params.push(end); clauses.push(`${col} <= $${params.length + 1}`) }
    return { clauses, params }
  }

  const { clauses: wClauses, params: wParams } = dateFilter('date')
  const wellnessRows = (await pool.query(
    `SELECT date, pain_level, energy_level, mood, sleep_hours, water_oz, creatine_taken, pain_areas, notes
     FROM wellness_logs WHERE user_id = $1 ${wClauses.length ? 'AND ' + wClauses.join(' AND ') : ''} ORDER BY date`,
    [req.user.id, ...wParams]
  )).rows

  const workoutRows = (await pool.query(
    `SELECT w.date, w.notes as workout_notes, e.name as exercise, s.set_number, s.weight_lbs, s.reps
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id
     LEFT JOIN exercises e ON e.id = s.exercise_id
     WHERE w.user_id = $1 ${wClauses.length ? 'AND w.' + wClauses.join(' AND w.') : ''} ORDER BY w.date, s.set_number`,
    [req.user.id, ...wParams]
  )).rows

  if (format === 'csv') {
    const wellnessCsv = [
      'date,pain_level,energy_level,mood,sleep_hours,water_oz,creatine_taken,pain_areas,notes',
      ...wellnessRows.map(r =>
        `${r.date.toISOString().split('T')[0]},${r.pain_level||''},${r.energy_level||''},${r.mood||''},${r.sleep_hours||''},${r.water_oz||''},${r.creatine_taken||''},"${(r.pain_areas||[]).join(';')}","${(r.notes||'').replace(/"/g,'""')}"`
      )
    ].join('\n')

    const workoutCsv = [
      'date,exercise,set_number,weight_lbs,reps',
      ...workoutRows.map(r =>
        `${r.date.toISOString().split('T')[0]},${r.exercise||''},${r.set_number||''},${r.weight_lbs||''},${r.reps||''}`
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="robo-trainer-export.csv"')
    return res.send(`# WELLNESS LOGS\n${wellnessCsv}\n\n# WORKOUTS\n${workoutCsv}`)
  }

  res.json({ wellness: wellnessRows, workouts: workoutRows })
})

module.exports = router
```

- [ ] **Step 7: Run all tests**

```bash
cd server && npm test
```

Expected: all tests pass across all test files.

- [ ] **Step 8: Commit**

```bash
git add server/routes/ server/__tests__/
git commit -m "feat: partner, stats, and export routes — backend complete"
```

---

## Phase 1 Complete ✓

Run the full test suite one final time:

```bash
cd server && npm test
```

Expected output: all test suites pass. Server starts cleanly with `npm run dev:server`.

**Next:** See `docs/superpowers/plans/2026-04-22-phase-2-frontend.md` for the React PWA implementation.
