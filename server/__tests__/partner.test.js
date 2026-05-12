const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joeToken, sydToken

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  const joe = await createUser({ name: 'Joe', email: 'joe@test.com', password: 'pw' })
  joeToken = joe.token

  // Joe invites Sydney, Sydney accepts
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

describe('POST /api/partner/workouts', () => {
  it('creates a workout for the partner', async () => {
    const res = await request(app)
      .post('/api/partner/workouts')
      .set(authHeader(joeToken))
      .send({ date: '2026-04-23', is_shared: true })
    expect(res.status).toBe(201)
    expect(res.body.is_shared).toBe(true)
    expect(res.body.sets).toEqual([])
    expect(res.body.date).toMatch(/2026-04-23/)
  })

  it('returns 404 when user has no partner', async () => {
    // Create a standalone user with no partner
    const { token: loneToken } = await createUser({ name: 'Lone', email: 'lone@test.com', password: 'pw' })
    const res = await request(app)
      .post('/api/partner/workouts')
      .set(authHeader(loneToken))
      .send({ date: '2026-04-23' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('No partner linked')
  })
})

describe('POST /api/partner/workouts/:id/sets', () => {
  it("adds a set to the partner's workout", async () => {
    // First create a workout for Sydney (using Joe's partner route)
    const workoutRes = await request(app)
      .post('/api/partner/workouts')
      .set(authHeader(joeToken))
      .send({ date: '2026-04-23', is_shared: true })
    expect(workoutRes.status).toBe(201)
    const workoutId = workoutRes.body.id

    // Need an exercise
    const exRes = await request(app)
      .post('/api/exercises')
      .set(authHeader(joeToken))
      .send({ name: 'Squat', muscle_group: 'legs' })

    // Add a set to Sydney's workout via Joe's partner route
    const setRes = await request(app)
      .post(`/api/partner/workouts/${workoutId}/sets`)
      .set(authHeader(joeToken))
      .send({ exercise_id: exRes.body.id, set_number: 1, weight_lbs: 135, reps: 8 })
    expect(setRes.status).toBe(201)
    expect(setRes.body.workout_id).toBe(workoutId)
    expect(setRes.body.set_number).toBe(1)
    expect(Number(setRes.body.weight_lbs)).toBe(135)
    expect(setRes.body.reps).toBe(8)
  })

  it('returns 404 when user has no partner', async () => {
    const { token: loneToken } = await createUser({ name: 'Lone2', email: 'lone2@test.com', password: 'pw' })
    const res = await request(app)
      .post('/api/partner/workouts/999/sets')
      .set(authHeader(loneToken))
      .send({ exercise_id: 1, set_number: 1 })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('No partner linked')
  })

  it('returns 404 for a workout not owned by the partner — sets', async () => {
    // Create a third user with no relation to Joe or Sydney
    const { token: thirdToken } = await createUser({ name: 'Third', email: 'third@test.com', password: 'pw' })

    // Create a workout owned by the third user (via their own workouts route)
    const thirdWorkoutRes = await request(app)
      .post('/api/workouts')
      .set(authHeader(thirdToken))
      .send({ date: '2026-04-23' })
    expect(thirdWorkoutRes.status).toBe(201)
    const thirdWorkoutId = thirdWorkoutRes.body.id

    // Joe tries to add a set to the third user's workout via the partner route
    const res = await request(app)
      .post(`/api/partner/workouts/${thirdWorkoutId}/sets`)
      .set(authHeader(joeToken))
      .send({ exercise_id: 1, set_number: 1, weight_lbs: 100, reps: 5 })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/partner/workouts/:id/photo', () => {
  it("updates photo_url on a partner's workout", async () => {
    const workoutRes = await request(app)
      .post('/api/partner/workouts')
      .set(authHeader(joeToken))
      .send({ date: '2026-04-23' })
    expect(workoutRes.status).toBe(201)
    const workoutId = workoutRes.body.id

    const res = await request(app)
      .put(`/api/partner/workouts/${workoutId}/photo`)
      .set(authHeader(joeToken))
      .send({ photo_url: 'https://res.cloudinary.com/test/photo.jpg' })

    expect(res.status).toBe(200)
    expect(res.body.photo_url).toBe('https://res.cloudinary.com/test/photo.jpg')
  })

  it('returns 404 for a workout not belonging to the partner', async () => {
    const res = await request(app)
      .put('/api/partner/workouts/99999/photo')
      .set(authHeader(joeToken))
      .send({ photo_url: 'https://example.com/photo.jpg' })

    expect(res.status).toBe(404)
  })
})
