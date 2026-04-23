const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  try {
    const password_hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, partner_id, created_at',
      [name, email, password_hash]
    )
    const user = result.rows[0]
    res.status(201).json({ token: makeToken(user), user })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const { password_hash, invite_token, ...safeUser } = user
    res.json({ token: makeToken(safeUser), user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/invite  (requires auth)
router.post('/invite', verifyToken, async (req, res) => {
  try {
    const token = uuidv4()
    await pool.query('UPDATE users SET invite_token = $1 WHERE id = $2', [token, req.user.id])
    const baseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
    res.json({ inviteUrl: `${baseUrl}/accept-invite?token=${token}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/accept-invite
router.post('/accept-invite', async (req, res) => {
  const { name, email, password, inviteToken } = req.body
  if (!name || !email || !password || !inviteToken) {
    return res.status(400).json({ error: 'name, email, password, and inviteToken are required' })
  }
  try {
    const inviterResult = await pool.query(
      'SELECT * FROM users WHERE invite_token = $1', [inviteToken]
    )
    const inviter = inviterResult.rows[0]
    if (!inviter) return res.status(404).json({ error: 'Invalid or expired invite token' })

    const password_hash = await bcrypt.hash(password, 10)
    const newUserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, partner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, partner_id, created_at',
      [name, email, password_hash, inviter.id]
    )
    const newUser = newUserResult.rows[0]

    // Link inviter to new user + clear token
    await pool.query(
      'UPDATE users SET partner_id = $1, invite_token = NULL WHERE id = $2',
      [newUser.id, inviter.id]
    )

    res.status(201).json({ token: makeToken(newUser), user: newUser })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me  (requires auth)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.partner_id, u.created_at,
              p.name AS partner_name
       FROM users u
       LEFT JOIN users p ON p.id = u.partner_id
       WHERE u.id = $1`,
      [req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
