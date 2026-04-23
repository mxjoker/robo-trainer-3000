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
