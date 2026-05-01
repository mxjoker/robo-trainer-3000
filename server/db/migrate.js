require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('./pool')

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

async function migrate() {
  try {
    for (const file of MIGRATIONS) {
      const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', file),
        'utf8'
      )
      await pool.query(sql)
      console.log(`✓ ${file}`)
    }
    console.log('All migrations complete')
  } finally {
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
