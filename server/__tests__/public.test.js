const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let userId, token, exerciseId

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  await pool.query(`
    INSERT INTO exercises (name, muscle_group)
    VALUES ('Bench Press', 'chest')
    ON CONFLICT DO NOTHING
  `)
  const data = await createUser({ name: 'Joe', email: 'joe@test.com' })
  token = data.token
  const userRow = await pool.query("SELECT id FROM users WHERE email = 'joe@test.com'")
  userId = userRow.rows[0].id
  const exRow = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = exRow.rows[0].id
})

afterAll(() => pool.end())

describe('GET /api/public/user/:userId', () => {
  it('returns 404 for an unknown userId', async () => {
    const res = await request(app).get('/api/public/user/999999')
    expect(res.status).toBe(404)
    expect(res.text).toContain('User not found')
  })

  it('does not require auth — returns 200 without a token', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.status).toBe(200)
  })

  it('returns text/plain content type', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
  })

  it('includes the user name in the output', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('Robo Trainer Stats for Joe')
  })

  it('includes workout and set data when workouts exist', async () => {
    const w = (await request(app)
      .post('/api/workouts')
      .set(authHeader(token))
      .send({ date: '2026-04-21' })).body
    await request(app)
      .post(`/api/workouts/${w.id}/sets`)
      .set(authHeader(token))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 185, reps: 8 })

    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('RECENT WORKOUTS')
    expect(res.text).toContain('Bench Press')
    expect(res.text).toContain('185 lbs')
  })

  it('includes PR section when weighted sets exist', async () => {
    const w = (await request(app)
      .post('/api/workouts')
      .set(authHeader(token))
      .send({ date: '2026-04-21' })).body
    await request(app)
      .post(`/api/workouts/${w.id}/sets`)
      .set(authHeader(token))
      .send({ exercise_id: exerciseId, set_number: 1, weight_lbs: 195, reps: 5 })

    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('PERSONAL RECORDS')
    expect(res.text).toContain('Bench Press: 195 lbs')
  })

  it('omits wellness section when no wellness data', async () => {
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).not.toContain('WELLNESS')
  })

  it('includes wellness section when wellness data exists', async () => {
    await pool.query(
      `INSERT INTO wellness_logs (user_id, date, pain_level, energy_level, mood)
       VALUES ($1, CURRENT_DATE, 3, 8, 7)`,
      [userId]
    )
    const res = await request(app).get(`/api/public/user/${userId}`)
    expect(res.text).toContain('WELLNESS')
    expect(res.text).toContain('Avg pain:')
    expect(res.text).toContain('Avg energy:')
  })
})
