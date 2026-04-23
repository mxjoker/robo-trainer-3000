const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getWorkoutWithSets(workoutId) {
  const workout = (await pool.query('SELECT * FROM workouts WHERE id = $1', [workoutId])).rows[0]
  if (!workout) return null
  const sets = (await pool.query(
    `SELECT s.*, e.name as exercise_name, e.muscle_group
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_id = $1 ORDER BY s.set_number`,
    [workoutId]
  )).rows
  return { ...workout, sets }
}

// GET /api/workouts
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query
    let query = 'SELECT * FROM workouts WHERE user_id = $1'
    const params = [req.user.id]
    if (start) { params.push(start); query += ` AND date >= $${params.length}` }
    if (end) { params.push(end); query += ` AND date <= $${params.length}` }
    query += ' ORDER BY date DESC'
    const result = await pool.query(query, params)
    const workouts = await Promise.all(result.rows.map(w => getWorkoutWithSets(w.id)))
    res.json(workouts)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/workouts
router.post('/', async (req, res) => {
  try {
    const { date, routine_id, notes, duration_minutes, is_shared = false } = req.body
    const result = await pool.query(
      `INSERT INTO workouts (user_id, date, routine_id, notes, duration_minutes, is_shared)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, date || new Date().toISOString().split('T')[0],
       routine_id || null, notes || null, duration_minutes || null, is_shared]
    )
    res.status(201).json({ ...result.rows[0], sets: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/workouts/:id/sets
router.post('/:id/sets', async (req, res) => {
  try {
    const { exercise_id, set_number, weight_lbs, reps } = req.body
    if (!exercise_id || set_number == null) {
      return res.status(400).json({ error: 'exercise_id and set_number are required' })
    }
    const workout = (await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    )).rows[0]
    if (!workout) return res.status(404).json({ error: 'Workout not found' })
    const result = await pool.query(
      'INSERT INTO sets (workout_id, exercise_id, set_number, weight_lbs, reps) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [workout.id, exercise_id, set_number, weight_lbs ?? null, reps ?? null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/workouts/sets/:id  — must be BEFORE PUT /:id
router.put('/sets/:id', async (req, res) => {
  try {
    const { weight_lbs, reps } = req.body
    // Verify the set belongs to a workout owned by this user
    const check = await pool.query(
      `SELECT s.id FROM sets s
       JOIN workouts w ON w.id = s.workout_id
       WHERE s.id = $1 AND w.user_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!check.rows[0]) return res.status(404).json({ error: 'Set not found' })
    const result = await pool.query(
      `UPDATE sets SET
         weight_lbs = COALESCE($1, weight_lbs),
         reps = COALESCE($2, reps)
       WHERE id = $3 RETURNING *`,
      [weight_lbs ?? null, reps ?? null, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/workouts/sets/:id  — must be BEFORE DELETE /:id
router.delete('/sets/:id', async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT s.id FROM sets s JOIN workouts w ON w.id = s.workout_id
       WHERE s.id = $1 AND w.user_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!check.rows[0]) return res.status(404).json({ error: 'Set not found' })
    await pool.query('DELETE FROM sets WHERE id = $1', [req.params.id])
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/workouts/:id
router.get('/:id', async (req, res) => {
  try {
    const workout = await getWorkoutWithSets(req.params.id)
    if (!workout || workout.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Workout not found' })
    }
    res.json(workout)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/workouts/:id
router.put('/:id', async (req, res) => {
  try {
    const { notes, duration_minutes } = req.body
    const result = await pool.query(
      `UPDATE workouts SET
         notes = COALESCE($1, notes),
         duration_minutes = COALESCE($2, duration_minutes)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [notes ?? null, duration_minutes ?? null, req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Workout not found' })
    res.json(await getWorkoutWithSets(result.rows[0].id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/workouts/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Workout not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
