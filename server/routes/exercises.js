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
  const { name, muscle_group, exercise_type, is_pt_exercise = false } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    const result = await pool.query(
      'INSERT INTO exercises (name, muscle_group, exercise_type, is_pt_exercise, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, muscle_group || null, exercise_type || null, is_pt_exercise, req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/exercises/:id — update user's own custom exercise
router.put('/:id', async (req, res) => {
  const { name, muscle_group, exercise_type, is_pt_exercise } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    const result = await pool.query(
      `UPDATE exercises SET name=$1, muscle_group=$2, exercise_type=$3, is_pt_exercise=$4
       WHERE id=$5 AND created_by=$6 RETURNING *`,
      [name, muscle_group || null, exercise_type || null, is_pt_exercise ?? false, req.params.id, req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/exercises/:id — delete user's own custom exercise
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM exercises WHERE id=$1 AND created_by=$2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
