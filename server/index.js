require('dotenv').config()
const app = require('./app')
const { pool } = require('./db/pool')
const { startScheduler } = require('./push/scheduler')
const fs = require('fs')
const path = require('path')

const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_add_meds.sql',
  '003_add_push.sql',
  '004_add_mobility.sql',
  '005_add_photo_url.sql',
  '006_add_routine_defaults.sql',
  '007_add_notification_utc_offset.sql',
  '008_add_exercise_type.sql',
  '009_routine_weight_and_4day.sql',
]

async function runMigrations() {
  for (const file of MIGRATIONS) {
    const sql = fs.readFileSync(
      path.join(__dirname, 'db/migrations', file),
      'utf8'
    )
    await pool.query(sql)
    console.log(`✓ migration: ${file}`)
  }
}

const PORT = process.env.PORT || 3001

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      startScheduler()
    })
  })
  .catch(err => {
    console.error('Migration failed, server not started:', err)
    process.exit(1)
  })
