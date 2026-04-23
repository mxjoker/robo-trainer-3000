const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  try {
    const { format = 'json', start, end } = req.query
    const params = [req.user.id]
    const dateClauses = []
    if (start) { params.push(start); dateClauses.push(`date >= $${params.length}`) }
    if (end) { params.push(end); dateClauses.push(`date <= $${params.length}`) }
    const dateWhere = dateClauses.length ? ' AND ' + dateClauses.join(' AND ') : ''

    const wellnessRows = (await pool.query(
      `SELECT date, pain_level, energy_level, mood, sleep_hours, water_oz, creatine_taken, pain_areas, notes
       FROM wellness_logs WHERE user_id = $1${dateWhere} ORDER BY date`,
      params
    )).rows

    const workoutRows = (await pool.query(
      `SELECT w.date, w.notes as workout_notes, e.name as exercise, s.set_number, s.weight_lbs, s.reps
       FROM workouts w
       LEFT JOIN sets s ON s.workout_id = w.id
       LEFT JOIN exercises e ON e.id = s.exercise_id
       WHERE w.user_id = $1${dateWhere} ORDER BY w.date, s.set_number`,
      params
    )).rows

    if (format === 'csv') {
      const fmtDate = d => d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0]
      const wellnessCsv = [
        'date,pain_level,energy_level,mood,sleep_hours,water_oz,creatine_taken,pain_areas,notes',
        ...wellnessRows.map(r =>
          `${fmtDate(r.date)},${r.pain_level ?? ''},${r.energy_level ?? ''},${r.mood ?? ''},` +
          `${r.sleep_hours ?? ''},${r.water_oz ?? ''},${r.creatine_taken ?? ''},` +
          `"${(r.pain_areas || []).join(';')}","${(r.notes || '').replace(/"/g, '""')}"`
        )
      ].join('\n')

      const workoutCsv = [
        'date,exercise,set_number,weight_lbs,reps',
        ...workoutRows.map(r =>
          `${fmtDate(r.date)},${r.exercise || ''},${r.set_number ?? ''},${r.weight_lbs ?? ''},${r.reps ?? ''}`
        )
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="robo-trainer-export.csv"')
      return res.send(`# WELLNESS LOGS\n${wellnessCsv}\n\n# WORKOUTS\n${workoutCsv}`)
    }

    res.json({ wellness: wellnessRows, workouts: workoutRows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
