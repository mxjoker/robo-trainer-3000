const cron = require('node-cron')
const webpush = require('web-push')
const { pool } = require('../db/pool')

async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    )
  } catch (err) {
    // Subscription expired — clean it up
    if (err.statusCode === 410) {
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [subscription.endpoint])
    }
  }
}

async function getUserSubscriptions(userId) {
  const result = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId])
  return result.rows
}

// Runs every hour at :00 — checks all users with notifications enabled
async function runScheduler() {
  if (!process.env.VAPID_PUBLIC_KEY) return

  const now = new Date()
  const currentUtcHour = now.getUTCHours()

  const { rows: prefs } = await pool.query(
    'SELECT * FROM notification_preferences WHERE water_enabled = true OR creatine_enabled = true OR workout_enabled = true'
  )

  for (const pref of prefs) {
    const subs = await getUserSubscriptions(pref.user_id)
    if (!subs.length) continue

    // Convert user's local hour setting to UTC for comparison
    const offset = pref.utc_offset ?? 0
    const localToUtc = (localHour) => ((localHour - offset) % 24 + 24) % 24
    const currentLocalHour = ((currentUtcHour + offset) % 24 + 24) % 24

    // Creatine reminder
    if (pref.creatine_enabled && currentUtcHour === localToUtc(pref.creatine_hour)) {
      for (const sub of subs) {
        await sendPush(sub, { title: 'Creatine reminder', body: "Don't forget your creatine!", tag: 'creatine' })
      }
    }

    // Workout reminder — only if no workout logged today
    if (pref.workout_enabled && currentUtcHour === localToUtc(pref.workout_hour)) {
      const today = now.toISOString().split('T')[0]
      const { rows } = await pool.query(
        'SELECT id FROM workouts WHERE user_id = $1 AND date = $2 LIMIT 1',
        [pref.user_id, today]
      )
      if (!rows.length) {
        for (const sub of subs) {
          await sendPush(sub, { title: 'Time to train', body: "You haven't logged a workout today.", tag: 'workout' })
        }
      }
    }

    // Water reminder — every N hours between start and end (in local time)
    if (pref.water_enabled) {
      const start = pref.water_start_hour
      const end = pref.water_end_hour
      const interval = pref.water_interval_hours
      if (currentLocalHour >= start && currentLocalHour < end && (currentLocalHour - start) % interval === 0) {
        for (const sub of subs) {
          await sendPush(sub, { title: 'Hydration check', body: 'Time to drink some water 💧', tag: 'water' })
        }
      }
    }
  }
}

function startScheduler() {
  // Run at the top of every hour
  cron.schedule('0 * * * *', runScheduler)
}

module.exports = { startScheduler }
