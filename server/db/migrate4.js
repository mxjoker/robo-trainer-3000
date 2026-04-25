require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '004_add_mobility.sql'),
    'utf8'
  )

  const dbs = [
    process.env.DATABASE_URL,
    process.env.TEST_DATABASE_URL,
  ].filter(Boolean)

  for (const connectionString of dbs) {
    const pool = new Pool({ connectionString })
    try {
      await pool.query(sql)
      console.log(`Migration complete on: ${connectionString}`)
    } finally {
      await pool.end()
    }
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
