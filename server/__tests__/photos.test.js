const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let joeToken, joeId

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  const joe = await createUser({ name: 'Joe', email: 'joe@test.com', password: 'pw' })
  joeToken = joe.token
  joeId = joe.user.id
})

afterAll(() => pool.end())

describe('POST /api/photos', () => {
  it('creates a standalone photo', async () => {
    const res = await request(app).post('/api/photos')
      .set(authHeader(joeToken))
      .send({ date: '2026-05-10', photo_url: 'https://cdn.example.com/img.jpg', notes: 'Week 8' })
    expect(res.status).toBe(201)
    expect(res.body.user_id).toBe(joeId)
    expect(res.body.notes).toBe('Week 8')
    // PostgreSQL DATE type returns 'YYYY-MM-DD' string
    expect(res.body.date).toMatch(/^2026-05-10/)
  })

  it('requires photo_url', async () => {
    const res = await request(app).post('/api/photos')
      .set(authHeader(joeToken))
      .send({ date: '2026-05-10' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/photos', () => {
  it("returns only the current user's photos", async () => {
    const other = await createUser({ name: 'Syd', email: 'syd@test.com', password: 'pw' })
    await request(app).post('/api/photos').set(authHeader(joeToken))
      .send({ date: '2026-05-10', photo_url: 'https://cdn.example.com/a.jpg' })
    await request(app).post('/api/photos').set(authHeader(other.token))
      .send({ date: '2026-05-11', photo_url: 'https://cdn.example.com/b.jpg' })
    const res = await request(app).get('/api/photos').set(authHeader(joeToken))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].photo_url).toBe('https://cdn.example.com/a.jpg')
  })
})

describe('DELETE /api/photos/:id', () => {
  it('deletes own photo', async () => {
    const { body: photo } = await request(app).post('/api/photos')
      .set(authHeader(joeToken))
      .send({ date: '2026-05-10', photo_url: 'https://cdn.example.com/a.jpg' })
    const res = await request(app).delete(`/api/photos/${photo.id}`).set(authHeader(joeToken))
    expect(res.status).toBe(204)
  })

  it("returns 404 when deleting another user's photo", async () => {
    const other = await createUser({ name: 'Syd', email: 'syd@test.com', password: 'pw' })
    const { body: photo } = await request(app).post('/api/photos')
      .set(authHeader(other.token))
      .send({ date: '2026-05-10', photo_url: 'https://cdn.example.com/a.jpg' })
    const res = await request(app).delete(`/api/photos/${photo.id}`).set(authHeader(joeToken))
    expect(res.status).toBe(404)
  })
})
