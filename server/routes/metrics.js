const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/metrics
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM body_metrics WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/metrics — upsert by (user_id, date)
router.post('/', async (req, res) => {
  try {
    const { date, weight_lbs, notes } = req.body
    const logDate = date || new Date().toISOString().split('T')[0]
    const result = await pool.query(
      `INSERT INTO body_metrics (user_id, date, weight_lbs, notes)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, date) DO UPDATE SET
         weight_lbs = EXCLUDED.weight_lbs,
         notes = EXCLUDED.notes
       RETURNING *, (xmax = 0) AS inserted`,
      [req.user.id, logDate, weight_lbs ?? null, notes ?? null]
    )
    const row = result.rows[0]
    res.status(row.inserted ? 201 : 200).json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
