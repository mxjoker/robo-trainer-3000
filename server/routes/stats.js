const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/stats/prs — max weight per exercise (current PR)
router.get('/prs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.exercise_id, e.name as exercise_name, MAX(s.weight_lbs) as max_weight_lbs
       FROM sets s
       JOIN workouts w ON w.id = s.workout_id
       JOIN exercises e ON e.id = s.exercise_id
       WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL
       GROUP BY s.exercise_id, e.name
       ORDER BY e.name`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/stats/strength/:exerciseId — per-workout max weight over time
router.get('/strength/:exerciseId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.date, MAX(s.weight_lbs) as max_weight_lbs, SUM(s.reps) as total_reps
       FROM sets s
       JOIN workouts w ON w.id = s.workout_id
       WHERE w.user_id = $1 AND s.exercise_id = $2 AND s.weight_lbs IS NOT NULL
       GROUP BY w.date ORDER BY w.date ASC`,
      [req.user.id, req.params.exerciseId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/stats/consistency — streak + calendar data
router.get('/consistency', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT date FROM workouts WHERE user_id = $1 ORDER BY date ASC`,
      [req.user.id]
    )
    const dates = result.rows.map(r => r.date.toISOString().split('T')[0])
    const total_workouts = dates.length

    const dateSet = new Set(dates)

    // Current streak: count backwards from today (grace: if today has no workout, start from yesterday)
    let current_streak = 0
    let check = new Date()
    const todayStr = check.toISOString().split('T')[0]
    if (!dateSet.has(todayStr)) check.setDate(check.getDate() - 1)
    while (true) {
      const d = check.toISOString().split('T')[0]
      if (dateSet.has(d)) {
        current_streak++
        check.setDate(check.getDate() - 1)
      } else {
        break
      }
    }

    // Longest streak
    let longest_streak = dates.length > 0 ? 1 : 0
    let temp = dates.length > 0 ? 1 : 0
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      const diff = (curr - prev) / (1000 * 60 * 60 * 24)
      temp = diff === 1 ? temp + 1 : 1
      if (temp > longest_streak) longest_streak = temp
    }

    res.json({ workout_dates: dates, current_streak, longest_streak, total_workouts })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/stats/health — pain + energy over time
router.get('/health', async (req, res) => {
  try {
    const { start, end } = req.query
    let query = `SELECT date, pain_level, energy_level, mood, sleep_hours
                 FROM wellness_logs WHERE user_id = $1`
    const params = [req.user.id]
    if (start) { params.push(start); query += ` AND date >= $${params.length}` }
    if (end) { params.push(end); query += ` AND date <= $${params.length}` }
    query += ' ORDER BY date ASC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
