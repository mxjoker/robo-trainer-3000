const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

async function getRoutineWithExercises(routineId) {
  const routine = (await pool.query('SELECT * FROM routines WHERE id = $1', [routineId])).rows[0]
  if (!routine) return null
  const exercises = (await pool.query(
    `SELECT e.*, re.sort_order FROM exercises e
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
  try {
    const { rows } = await pool.query(
      'INSERT INTO routines (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name]
    )
    const routine = rows[0]
    for (let i = 0; i < exerciseIds.length; i++) {
      await pool.query(
        'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
        [routine.id, exerciseIds[i], i]
      )
    }
    res.status(201).json(await getRoutineWithExercises(routine.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/routines/:id
router.put('/:id', async (req, res) => {
  const { name, exerciseIds } = req.body
  try {
    const routine = (await pool.query(
      'SELECT * FROM routines WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    )).rows[0]
    if (!routine) return res.status(404).json({ error: 'Routine not found' })
    if (name) await pool.query('UPDATE routines SET name = $1 WHERE id = $2', [name, routine.id])
    if (exerciseIds) {
      await pool.query('DELETE FROM routine_exercises WHERE routine_id = $1', [routine.id])
      for (let i = 0; i < exerciseIds.length; i++) {
        await pool.query(
          'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
          [routine.id, exerciseIds[i], i]
        )
      }
    }
    res.json(await getRoutineWithExercises(routine.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
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

module.exports = router
