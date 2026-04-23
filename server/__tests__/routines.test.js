const request = require('supertest')
const app = require('../app')
const { pool } = require('../db/pool')
const { createUser, authHeader } = require('./helpers')

let token, exerciseId

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  await pool.query(`
    INSERT INTO exercises (name, muscle_group, is_pt_exercise) VALUES
      ('Bench Press', 'chest', false)
  `)
  const data = await createUser()
  token = data.token
  const ex = await pool.query("SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1")
  exerciseId = ex.rows[0].id
})

afterAll(() => pool.end())

describe('POST /api/routines', () => {
  it('creates a routine with exercises', async () => {
    const res = await request(app).post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Push Day', exerciseIds: [exerciseId] })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Push Day')
    expect(res.body.exercises).toHaveLength(1)
  })
})

describe('GET /api/routines', () => {
  it("returns the user's routines", async () => {
    await request(app).post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Push Day', exerciseIds: [] })
    const res = await request(app).get('/api/routines').set(authHeader(token))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('DELETE /api/routines/:id', () => {
  it('deletes a routine', async () => {
    const { body: routine } = await request(app).post('/api/routines')
      .set(authHeader(token))
      .send({ name: 'Push Day', exerciseIds: [] })
    const res = await request(app).delete(`/api/routines/${routine.id}`).set(authHeader(token))
    expect(res.status).toBe(204)
  })
})
