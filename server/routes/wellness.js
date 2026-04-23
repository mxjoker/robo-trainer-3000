const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/wellness/today  — must be before GET /:date to avoid param conflict
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const result = await pool.query(
      'SELECT * FROM wellness_logs WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/wellness
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query
    let query = 'SELECT * FROM wellness_logs WHERE user_id = $1'
    const params = [req.user.id]
    if (start) { params.push(start); query += ` AND date >= $${params.length}` }
    if (end) { params.push(end); query += ` AND date <= $${params.length}` }
    query += ' ORDER BY date DESC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/wellness — upsert by (user_id, date)
router.post('/', async (req, res) => {
  try {
    const { date, pain_level, energy_level, mood, sleep_hours, water_oz,
            creatine_taken, pain_areas, notes } = req.body
    const logDate = date || new Date().toISOString().split('T')[0]
    const result = await pool.query(
      `INSERT INTO wellness_logs
         (user_id, date, pain_level, energy_level, mood, sleep_hours, water_oz, creatine_taken, pain_areas, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id, date) DO UPDATE SET
         pain_level = EXCLUDED.pain_level,
         energy_level = EXCLUDED.energy_level,
         mood = EXCLUDED.mood,
         sleep_hours = EXCLUDED.sleep_hours,
         water_oz = EXCLUDED.water_oz,
         creatine_taken = EXCLUDED.creatine_taken,
         pain_areas = EXCLUDED.pain_areas,
         notes = EXCLUDED.notes
       RETURNING *, (xmax = 0) AS inserted`,
      [req.user.id, logDate,
       pain_level ?? null, energy_level ?? null, mood ?? null,
       sleep_hours ?? null, water_oz ?? null,
       creatine_taken ?? false, pain_areas ?? [], notes ?? null]
    )
    const row = result.rows[0]
    const status = row.inserted ? 201 : 200
    res.status(status).json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
