const request = require('supertest')
const app = require('../app')

async function createUser({ name = 'Joe', email = 'joe@test.com', password = 'password123' } = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password })
  return res.body // { token, user }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

module.exports = { createUser, authHeader }
