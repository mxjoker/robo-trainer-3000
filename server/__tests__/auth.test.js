const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
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
