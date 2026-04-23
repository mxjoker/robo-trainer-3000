const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joe, token

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  await pool.query(`
    INSERT INTO exercises (name, muscle_group, is_pt_exercise) VALUES
      ('Bench Press', 'chest', false),
      ('Squat', 'legs', false),
      ('Deadlift', 'back', false)
  `)
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
