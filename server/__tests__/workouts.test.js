const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joeToken, joeId, exerciseId

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  // Re-seed one exercise in case TRUNCATE cascade affected exercises
  await pool.query(`
    INSERT INTO exercises (name, muscle_group, is_pt_exercise)
    VALUES ('Bench Press', 'chest', false)
    ON CONFLICT DO NOTHING
  `)
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
