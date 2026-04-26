const express = require('express')
const { pool } = require('../db/pool')

const router = express.Router()

// GET /api/public/user/:userId — no auth required
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) return res.status(404).type('text').send('User not found')

    const userRow = (await pool.query('SELECT name FROM users WHERE id = $1', [userId])).rows[0]
    if (!userRow) return res.status(404).type('text').send('User not found')

    // Parallel: recent workouts, PRs, wellness averages
    const [workoutsResult, prsResult, wellnessResult] = await Promise.all([
      pool.query(
        `SELECT id, date, notes FROM workouts WHERE user_id = $1 ORDER BY date DESC, id DESC LIMIT 10`,
        [userId]
      ),
      pool.query(
        `SELECT e.name AS exercise_name, MAX(s.weight_lbs) AS max_weight_lbs
         FROM sets s
         JOIN workouts w ON w.id = s.workout_id
         JOIN exercises e ON e.id = s.exercise_id
         WHERE w.user_id = $1 AND s.weight_lbs IS NOT NULL AND s.weight_lbs > 0
         GROUP BY s.exercise_id, e.name
         ORDER BY e.name`,
        [userId]
      ),
      pool.query(
        `SELECT ROUND(AVG(pain_level)::numeric, 1) AS avg_pain,
                ROUND(AVG(energy_level)::numeric, 1) AS avg_energy,
                ROUND(AVG(mood)::numeric, 1) AS avg_mood
         FROM wellness_logs
         WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
        [userId]
      ),
    ])

    // Fetch sets for the recent workouts
    const workoutIds = workoutsResult.rows.map(w => w.id)
    let setsRows = []
    if (workoutIds.length > 0) {
      const setsResult = await pool.query(
        `SELECT s.workout_id, e.name AS exercise_name, s.set_number, s.reps, s.weight_lbs
         FROM sets s JOIN exercises e ON e.id = s.exercise_id
         WHERE s.workout_id = ANY($1)
         ORDER BY s.workout_id, s.set_number`,
        [workoutIds]
      )
      setsRows = setsResult.rows
    }

    // Build plaintext output
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const lines = [`Robo Trainer Stats for ${userRow.name}`, `Last updated: ${today}`, '']

    if (workoutsResult.rows.length > 0) {
      lines.push('=== RECENT WORKOUTS ===')
      for (const workout of workoutsResult.rows) {
        const dateStr = workout.date.toString().slice(0, 10)
        const d = new Date(dateStr + 'T12:00:00Z')
        lines.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
        if (workout.notes) lines.push(`  Notes: ${workout.notes}`)
        for (const set of setsRows.filter(s => s.workout_id === workout.id)) {
          const weightPart = set.weight_lbs ? ` @ ${parseFloat(set.weight_lbs)} lbs` : ''
          lines.push(`  ${set.exercise_name}: ${set.reps} reps${weightPart}`)
        }
        lines.push('')
      }
    }

    if (prsResult.rows.length > 0) {
      lines.push('=== PERSONAL RECORDS ===')
      for (const pr of prsResult.rows) {
        const weight = parseFloat(pr.max_weight_lbs)
        lines.push(`${pr.exercise_name}: ${weight} lbs`)
      }
      lines.push('')
    }

    const w = wellnessResult.rows[0]
    if (w && w.avg_pain !== null) {
      lines.push('=== WELLNESS (last 30 days) ===')
      lines.push(`Avg pain: ${w.avg_pain}/10 | Avg energy: ${w.avg_energy}/10 | Avg mood: ${w.avg_mood}/10`)
    }

    res.type('text').send(lines.join('\n'))
  } catch (err) {
    console.error(err)
    res.status(500).type('text').send('Server error')
  }
})

module.exports = router
