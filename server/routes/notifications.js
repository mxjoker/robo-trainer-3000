const express = require('express')
const webpush = require('web-push')
const { pool } = require('../db/pool')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()
router.use(verifyToken)

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@robo-trainer.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// POST /api/notifications/subscribe
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint, keys.p256dh, and keys.auth are required' })
  }
  const result = await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
     RETURNING *`,
    [req.user.id, endpoint, keys.p256dh, keys.auth]
  )
  res.status(201).json(result.rows[0])
})

// DELETE /api/notifications/subscribe
router.delete('/subscribe', async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })
  await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
    [req.user.id, endpoint]
  )
  res.status(204).send()
})

// GET /api/notifications/preferences
router.get('/preferences', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notification_preferences WHERE user_id = $1',
    [req.user.id]
  )
  if (result.rows[0]) return res.json(result.rows[0])

  // Return defaults if no row yet
  res.json({
    user_id: req.user.id,
    water_enabled: false,
    water_interval_hours: 2,
    water_start_hour: 8,
    water_end_hour: 20,
    creatine_enabled: false,
    creatine_hour: 8,
    workout_enabled: false,
    workout_hour: 18
  })
})

// PUT /api/notifications/preferences
router.put('/preferences', async (req, res) => {
  const {
    water_enabled, water_interval_hours, water_start_hour, water_end_hour,
    creatine_enabled, creatine_hour,
    workout_enabled, workout_hour
  } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO notification_preferences
         (user_id, water_enabled, water_interval_hours, water_start_hour, water_end_hour,
          creatine_enabled, creatine_hour, workout_enabled, workout_hour, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         water_enabled = COALESCE($2, notification_preferences.water_enabled),
         water_interval_hours = COALESCE($3, notification_preferences.water_interval_hours),
         water_start_hour = COALESCE($4, notification_preferences.water_start_hour),
         water_end_hour = COALESCE($5, notification_preferences.water_end_hour),
         creatine_enabled = COALESCE($6, notification_preferences.creatine_enabled),
         creatine_hour = COALESCE($7, notification_preferences.creatine_hour),
         workout_enabled = COALESCE($8, notification_preferences.workout_enabled),
         workout_hour = COALESCE($9, notification_preferences.workout_hour),
         updated_at = NOW()
       RETURNING *`,
      [req.user.id,
       water_enabled ?? null, water_interval_hours ?? null,
       water_start_hour ?? null, water_end_hour ?? null,
       creatine_enabled ?? null, creatine_hour ?? null,
       workout_enabled ?? null, workout_hour ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

module.exports = { router, webpush }
