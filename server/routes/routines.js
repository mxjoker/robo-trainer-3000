const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getRoutineWithExercises(routineId) {
  const routine = (await pool.query('SELECT * FROM routines WHERE id = $1', [routineId])).rows[0]
  if (!routine) return null
  const exercises = (await pool.query(
    `SELECT e.*, re.sort_order, re.default_sets, re.default_reps, re.default_weight_lbs FROM exercises e
     JOIN routine_exercises re ON re.exercise_id = e.id
     WHERE re.routine_id = $1 ORDER BY re.sort_order`,
    [routineId]
  )).rows
  return { ...routine, exercises }
}

// GET /api/routines
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM routines WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    )
    const routines = await Promise.all(result.rows.map(r => getRoutineWithExercises(r.id)))
    res.json(routines)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/routines
router.post('/', async (req, res) => {
  const { name, exerciseIds = [] } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'INSERT INTO routines (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name]
    )
    const routine = rows[0]
    for (let i = 0; i < exerciseIds.length; i++) {
      await client.query(
        'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
        [routine.id, exerciseIds[i], i]
      )
    }
    await client.query('COMMIT')
    res.status(201).json(await getRoutineWithExercises(routine.id))
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// PUT /api/routines/:id
router.put('/:id', async (req, res) => {
  const { name, exerciseIds } = req.body
  const client = await pool.connect()
  try {
    const routine = (await client.query(
      'SELECT * FROM routines WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    )).rows[0]
    if (!routine) {
      client.release()
      return res.status(404).json({ error: 'Routine not found' })
    }
    await client.query('BEGIN')
    if (name) await client.query('UPDATE routines SET name = $1 WHERE id = $2', [name, routine.id])
    if (exerciseIds) {
      await client.query('DELETE FROM routine_exercises WHERE routine_id = $1', [routine.id])
      for (let i = 0; i < exerciseIds.length; i++) {
        await client.query(
          'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
          [routine.id, exerciseIds[i], i]
        )
      }
    }
    await client.query('COMMIT')
    res.json(await getRoutineWithExercises(routine.id))
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// DELETE /api/routines/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM routines WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Routine not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/routines/seed-defaults — creates Day A/B/C routines if not already seeded
router.post('/seed-defaults', async (req, res) => {
  const userId = req.user.id
  const client = await pool.connect()

  const DEFAULT_DAYS = [
    {
      name: 'Day A — Push + Core',
      exercises: [
        { name: 'Chest Press Machine', sets: 3, reps: 10 },
        { name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
        { name: 'Cable Tricep Pushdown (Rope)', sets: 3, reps: 10 },
        { name: 'Lateral Raise (Dumbbell)', sets: 3, reps: 12 },
        { name: 'Ab Crunch Machine', sets: 3, reps: 12 },
        { name: 'Pallof Press', sets: 3, reps: 10 },
      ],
    },
    {
      name: 'Day B — Pull + Hinge',
      exercises: [
        { name: 'Lat Pulldown', sets: 3, reps: 10 },
        { name: 'Seated Row Machine', sets: 3, reps: 10 },
        { name: 'Romanian Deadlift (Dumbbell)', sets: 3, reps: 10 },
        { name: 'Back Extension (Roman Chair)', sets: 3, reps: 10 },
        { name: 'Seated Leg Curl Machine', sets: 3, reps: 12 },
        { name: 'Rear Delt Machine', sets: 3, reps: 12 },
        { name: 'Bicep Curl Machine', sets: 3, reps: 10 },
        { name: 'Pallof Press', sets: 3, reps: 10 },
      ],
    },
    {
      name: 'Day C — Lower Focus',
      exercises: [
        { name: 'Leg Press', sets: 3, reps: 10 },
        { name: 'Glute Drive Machine', sets: 3, reps: 10 },
        { name: 'Seated Hip Abduction Machine', sets: 3, reps: 12 },
        { name: 'Cable Kickback', sets: 3, reps: 12 },
        { name: 'Bicep Curl Machine', sets: 3, reps: 10 },
        { name: 'Cable Tricep Pushdown (Rope)', sets: 3, reps: 10 },
        { name: 'Ab Crunch Machine', sets: 3, reps: 12 },
      ],
    },
    {
      name: 'Day D — Stability + Accessories',
      exercises: [
        { name: 'Pallof Press', sets: 3, reps: 10 },
        { name: 'Dumbbell Serratus Punch', sets: 3, reps: 12 },
        { name: 'Face Pull', sets: 3, reps: 12 },
        { name: 'Side Plank', sets: 3, reps: 20 },
        { name: 'Side-Lying Hip Abduction', sets: 3, reps: 12 },
        { name: 'Back Extension (Roman Chair)', sets: 2, reps: 12 },
        { name: 'Cable External Rotation', sets: 3, reps: 10 },
        { name: 'Cable Press (Short Range)', sets: 3, reps: 10 },
      ],
    },
  ]

  try {
    await client.query('BEGIN')

    // Delete existing Day routines so this always resets to current defaults
    const existing = await client.query(
      "SELECT id FROM routines WHERE user_id = $1 AND name LIKE 'Day %'",
      [userId]
    )
    for (const r of existing.rows) {
      await client.query('DELETE FROM routine_exercises WHERE routine_id = $1', [r.id])
      await client.query('DELETE FROM routines WHERE id = $1', [r.id])
    }

    const created = []

    for (const day of DEFAULT_DAYS) {
      const exerciseIds = []
      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i]
        const { rows } = await client.query(
          `INSERT INTO exercises (name, muscle_group)
           VALUES ($1, 'other')
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [ex.name]
        )
        exerciseIds.push({ id: rows[0].id, sets: ex.sets, reps: ex.reps, weight: ex.weight ?? 0 })
      }

      const { rows: routineRows } = await client.query(
        'INSERT INTO routines (user_id, name) VALUES ($1, $2) RETURNING *',
        [userId, day.name]
      )
      const routine = routineRows[0]

      for (let i = 0; i < exerciseIds.length; i++) {
        const { id, sets, reps, weight } = exerciseIds[i]
        await client.query(
          `INSERT INTO routine_exercises (routine_id, exercise_id, sort_order, default_sets, default_reps, default_weight_lbs)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [routine.id, id, i, sets, reps, weight]
        )
      }
      created.push(routine)
    }

    await client.query('COMMIT')
    res.status(201).json({ message: 'Seeded', routines: created })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

module.exports = router
