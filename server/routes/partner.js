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

// PUT /api/partner/workouts/:id/photo — set photo_url on a partner's workout
router.put('/workouts/:id/photo', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const { photo_url } = req.body
    const check = await pool.query(
      'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
      [req.params.id, partnerId]
    )
    if (!check.rows[0]) return res.status(404).json({ error: 'Workout not found' })
    const result = await pool.query(
      'UPDATE workouts SET photo_url = $1 WHERE id = $2 RETURNING *',
      [photo_url ?? null, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/partner/metrics — log body weight on behalf of partner
router.post('/metrics', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const { weight_lbs, date } = req.body
    const logDate = date || new Date().toISOString().split('T')[0]
    const { rows } = await pool.query(
      `INSERT INTO body_metrics (user_id, date, weight_lbs)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET weight_lbs = EXCLUDED.weight_lbs
       RETURNING *`,
      [partnerId, logDate, weight_lbs]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/partner/exercises/prs — partner's PRs as map: { [exercise_id]: maxWeight }
router.get('/exercises/prs', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.json({})
    const { rows } = await pool.query(
      `SELECT s.exercise_id, MAX(s.weight_lbs) AS pr
       FROM sets s JOIN workouts w ON w.id = s.workout_id
       WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL
       GROUP BY s.exercise_id`,
      [partnerId]
    )
    const prs = {}
    for (const row of rows) prs[row.exercise_id] = Number(row.pr)
    res.json(prs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/partner/stats/strength/:exerciseId — partner's max weight over time for one exercise
router.get('/stats/strength/:exerciseId', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const result = await pool.query(
      `SELECT w.date, MAX(s.weight_lbs) as max_weight_lbs, SUM(s.reps) as total_reps
       FROM sets s JOIN workouts w ON w.id = s.workout_id
       WHERE w.user_id = $1 AND s.exercise_id = $2 AND s.weight_lbs IS NOT NULL
       GROUP BY w.date ORDER BY w.date ASC`,
      [partnerId, req.params.exerciseId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/partner/stats/health — partner's pain + energy over time
router.get('/stats/health', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const { start, end } = req.query
    let query = `SELECT date, pain_level, energy_level, mood, sleep_hours
                 FROM wellness_logs WHERE user_id = $1`
    const params = [partnerId]
    if (start) { params.push(start); query += ` AND date >= $${params.length}` }
    if (end)   { params.push(end);   query += ` AND date <= $${params.length}` }
    query += ' ORDER BY date ASC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/partner/stats/consistency — partner's streak + total workouts
router.get('/stats/consistency', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const result = await pool.query(
      `SELECT DISTINCT date FROM workouts WHERE user_id = $1 ORDER BY date ASC`,
      [partnerId]
    )
    const dates = result.rows.map(r => r.date.toISOString().split('T')[0])
    const total_workouts = dates.length
    const dateSet = new Set(dates)

    let current_streak = 0
    let check = new Date()
    const todayStr = check.toISOString().split('T')[0]
    if (!dateSet.has(todayStr)) check.setDate(check.getDate() - 1)
    while (true) {
      const d = check.toISOString().split('T')[0]
      if (dateSet.has(d)) { current_streak++; check.setDate(check.getDate() - 1) }
      else break
    }

    let longest_streak = dates.length > 0 ? 1 : 0
    let temp = dates.length > 0 ? 1 : 0
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24)
      temp = diff === 1 ? temp + 1 : 1
      if (temp > longest_streak) longest_streak = temp
    }

    res.json({ workout_dates: dates, current_streak, longest_streak, total_workouts })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/partner/stats/prs — partner's personal records (max weight per exercise)
router.get('/stats/prs', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const { rows } = await pool.query(
      `SELECT e.id AS exercise_id, e.name AS exercise_name, MAX(s.weight_lbs) AS max_weight_lbs
       FROM sets s
       JOIN exercises e ON e.id = s.exercise_id
       JOIN workouts w ON w.id = s.workout_id
       WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL
       GROUP BY e.id, e.name
       ORDER BY MAX(s.weight_lbs) DESC`,
      [partnerId]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/photos', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const result = await pool.query(
      'SELECT * FROM progress_photos WHERE user_id = $1 ORDER BY date DESC',
      [partnerId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/photos', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const { date, photo_url, notes } = req.body
    if (!photo_url) return res.status(400).json({ error: 'photo_url is required' })
    const result = await pool.query(
      'INSERT INTO progress_photos (user_id, date, photo_url, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [partnerId, date || new Date().toISOString().split('T')[0], photo_url, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/photos/:id', async (req, res) => {
  try {
    const partnerId = await getPartnerId(req.user.id)
    if (!partnerId) return res.status(404).json({ error: 'No partner linked' })
    const id = parseInt(req.params.id, 10)
    if (!id || id < 1) return res.status(400).json({ error: 'Invalid id' })
    const result = await pool.query(
      'DELETE FROM progress_photos WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, partnerId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Photo not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
