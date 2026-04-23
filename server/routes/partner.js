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
      'SELECT id, user_id, date, routine_id, notes, duration_minutes, is_shared FROM workouts WHERE user_id = $1 ORDER BY date DESC', [partnerId]
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

module.exports = router
