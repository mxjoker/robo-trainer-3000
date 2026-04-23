const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/exercises — global + user's custom
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE created_by IS NULL OR created_by = $1 ORDER BY name',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/exercises — create custom exercise
router.post('/', async (req, res) => {
  const { name, muscle_group, is_pt_exercise = false } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    const result = await pool.query(
      'INSERT INTO exercises (name, muscle_group, is_pt_exercise, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, muscle_group || null, is_pt_exercise, req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
