const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
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
