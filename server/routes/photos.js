const express = require('express')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

// GET /api/photos — list (no data_url for performance)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, date, label, created_at FROM progress_photos WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/photos/:id — single photo with full data_url
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM progress_photos WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Photo not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/photos — upload a photo
router.post('/', async (req, res) => {
  try {
    const { date, label, data_url } = req.body
    if (!data_url) return res.status(400).json({ error: 'data_url is required' })
    const result = await pool.query(
      `INSERT INTO progress_photos (user_id, date, label, data_url)
       VALUES ($1, $2, $3, $4) RETURNING id, date, label, created_at`,
      [req.user.id, date || new Date().toISOString().split('T')[0], label || null, data_url]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/photos/:id — delete a photo (owner check)
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
