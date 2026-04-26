const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token
let token2

const FAKE_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k='

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  const data = await createUser()
  token = data.token
  const data2 = await createUser({ email: 'other@test.com' })
  token2 = data2.token
})

afterAll(() => pool.end())

describe('POST /api/photos', () => {
  it('creates a photo and returns 201', async () => {
    const res = await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', label: 'Front pose', data_url: FAKE_DATA_URL })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.label).toBe('Front pose')
    expect(res.body.date).toBeDefined()
    // data_url should NOT be in the list response (only in single-photo GET)
  })

  it('returns 400 when data_url is missing', async () => {
    const res = await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', label: 'No photo' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/photos', () => {
  it('returns array without data_url', async () => {
    await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', data_url: FAKE_DATA_URL })
    const res = await request(app).get('/api/photos').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
    expect(res.body[0].data_url).toBeUndefined()
    expect(res.body[0].id).toBeDefined()
  })
})

describe('GET /api/photos/:id', () => {
  it('returns full data_url for owned photo', async () => {
    const post = await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', data_url: FAKE_DATA_URL })
    const res = await request(app).get(`/api/photos/${post.body.id}`).set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body.data_url).toBe(FAKE_DATA_URL)
  })

  it('returns 404 for another user\'s photo', async () => {
    const post = await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', data_url: FAKE_DATA_URL })
    const res = await request(app).get(`/api/photos/${post.body.id}`).set(authHeader(token2))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/photos/:id', () => {
  it('removes a photo', async () => {
    const post = await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', data_url: FAKE_DATA_URL })
    const del = await request(app).delete(`/api/photos/${post.body.id}`).set(authHeader(token))
    expect(del.status).toBe(204)
    const get = await request(app).get(`/api/photos/${post.body.id}`).set(authHeader(token))
    expect(get.status).toBe(404)
  })

  it('returns 404 when deleting another user\'s photo', async () => {
    const post = await request(app).post('/api/photos')
      .set(authHeader(token))
      .send({ date: '2026-04-26', data_url: FAKE_DATA_URL })
    const del = await request(app).delete(`/api/photos/${post.body.id}`).set(authHeader(token2))
    expect(del.status).toBe(404)
  })
})
