const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
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
