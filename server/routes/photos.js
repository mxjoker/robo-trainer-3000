const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM progress_photos WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { date, photo_url, notes } = req.body
    if (!photo_url) return res.status(400).json({ error: 'photo_url is required' })
    const result = await pool.query(
      'INSERT INTO progress_photos (user_id, date, photo_url, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, date || new Date().toISOString().split('T')[0], photo_url, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM progress_photos WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Photo not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
