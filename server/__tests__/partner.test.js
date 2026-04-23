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
