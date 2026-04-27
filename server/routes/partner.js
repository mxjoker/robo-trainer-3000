const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getPartnerId(userId) {
  const result = await pool.query('SELECT partner_id FROM users WHERE id = $1', [userId])
  return result.rows[0]?.partner_id || null
}

router.get('/profile', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1', [partnerId]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/workouts', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const workouts = await pool.query(
      'SELECT id, user_id, date, routine_id, notes, duration_minutes, is_shared, photo_url FROM workouts WHERE user_id = $1 ORDER BY date DESC', [partnerId]
    )
    const withSets = await Promise.all(workouts.rows.map(async w => {
      const sets = (await pool.query(
        `SELECT s.*, e.name as exercise_name FROM sets s
         JOIN exercises e ON e.id = s.exercise_id WHERE s.workout_id = $1 ORDER BY s.set_number`,
        [w.id]
      )).rows
      return { ...w, sets }
    }))
    res.json(withSets)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/wellness', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const result = await pool.query(
      `SELECT id, user_id, date, pain_level, energy_level, mood, sleep_hours,
        water_oz, creatine_taken, pain_areas, notes
 FROM wellness_logs WHERE user_id = $1 ORDER BY date DESC`, [partnerId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/metrics', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const result = await pool.query(
      'SELECT id, user_id, date, weight_lbs, notes FROM body_metrics WHERE user_id = $1 ORDER BY date DESC', [partnerId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/partner/workouts — create a workout on the partner's behalf
router.post('/workouts', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const { date, is_shared } = req.body
    const result = await pool.query(
      'INSERT INTO workouts (user_id, date, is_shared) VALUES ($1, $2, $3) RETURNING *',
      [partnerId, date || new Date().toISOString().split('T')[0], is_shared ?? false]
    )
    res.status(201).json({ ...result.rows[0], sets: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/partner/workouts/:id/sets — add a set to partner's workout
router.post('/workouts/:id/sets', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    // Verify the workout belongs to the partner
    const workoutCheck = await pool.query(
      'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
      [req.params.id, partnerId]
    )
    if (!workoutCheck.rows[0]) return res.status(404).json({ error: 'Workout not found' })
    const { exercise_id, set_number, weight_lbs, reps } = req.body
    const result = await pool.query(
      'INSERT INTO sets (workout_id, exercise_id, set_number, weight_lbs, reps) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, exercise_id, set_number, weight_lbs ?? null, reps ?? null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
