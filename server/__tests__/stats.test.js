const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token, exerciseId

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  await pool.query(`
    INSERT INTO exercises (name, muscle_group, is_pt_exercise)
    VALUES ('Bench Press', 'chest', false)
    ON CONFLICT DO NOTHING
  `)
  const data = await createUser()
  token = data.token
  const ex = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = ex.rows[0].id

  // Create 2 workouts with increasing weight
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
  it('returns workout dates and streak info', async () => {
    const res = await request(app).get('/api/stats/consistency').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.workout_dates).toHaveLength(2)
    expect(res.body).toHaveProperty('current_streak')
    expect(res.body).toHaveProperty('longest_streak')
    expect(res.body).toHaveProperty('total_workouts')
  })
})
