const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token

const fakeSubscription = {
  endpoint: 'https://fcm.googleapis.com/fake-endpoint-123',
  keys: { p256dh: 'fake-p256dh-key', auth: 'fake-auth-key' }
}

beforeEach(async () => {
  await pool.query('DELETE FROM push_subscriptions; DELETE FROM notification_preferences; DELETE FROM users')
  const data = await createUser()
  token = data.token
})

afterAll(() => pool.end())

describe('POST /api/notifications/subscribe', () => {
  it('saves a push subscription and returns 201', async () => {
    const res = await request(app)
      .post('/api/notifications/subscribe')
      .set(authHeader(token))
      .send(fakeSubscription)
    expect(res.status).toBe(201)
    expect(res.body.endpoint).toBe(fakeSubscription.endpoint)
  })

  it('upserts if same endpoint is re-subscribed', async () => {
    await request(app).post('/api/notifications/subscribe')
      .set(authHeader(token)).send(fakeSubscription)
    const res = await request(app).post('/api/notifications/subscribe')
      .set(authHeader(token)).send(fakeSubscription)
    expect(res.status).toBe(201)
  })
})

describe('DELETE /api/notifications/subscribe', () => {
  it('removes subscription and returns 204', async () => {
    await request(app).post('/api/notifications/subscribe')
      .set(authHeader(token)).send(fakeSubscription)
    const res = await request(app)
      .delete('/api/notifications/subscribe')
      .set(authHeader(token))
      .send({ endpoint: fakeSubscription.endpoint })
    expect(res.status).toBe(204)
  })
})

describe('GET /api/notifications/preferences', () => {
  it('returns default preferences for a new user', async () => {
    const res = await request(app)
      .get('/api/notifications/preferences')
      .set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      water_enabled: false,
      creatine_enabled: false,
      workout_enabled: false
    })
  })
})

describe('PUT /api/notifications/preferences', () => {
  it('saves and returns updated preferences', async () => {
    const res = await request(app)
      .put('/api/notifications/preferences')
      .set(authHeader(token))
      .send({ water_enabled: true, water_interval_hours: 3, creatine_enabled: true, creatine_hour: 9 })
    expect(res.status).toBe(200)
    expect(res.body.water_enabled).toBe(true)
    expect(res.body.water_interval_hours).toBe(3)
    expect(res.body.creatine_enabled).toBe(true)
    expect(res.body.creatine_hour).toBe(9)
  })
})
