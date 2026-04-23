const path = require('path')
const fs = require('fs')

module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test'
  process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ||
    'postgresql://localhost:5432/robo_trainer_test'
  process.env.JWT_SECRET = 'test_jwt_secret'

  const { Pool } = require('pg')
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })

  // Drop and recreate all tables cleanly
  await pool.query(`
    DROP TABLE IF EXISTS sets CASCADE;
    DROP TABLE IF EXISTS workouts CASCADE;
    DROP TABLE IF EXISTS wellness_logs CASCADE;
    DROP TABLE IF EXISTS body_metrics CASCADE;
    DROP TABLE IF EXISTS routine_exercises CASCADE;
    DROP TABLE IF EXISTS routines CASCADE;
    DROP TABLE IF EXISTS exercises CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `)

  const sql = fs.readFileSync(
    path.join(__dirname, '../db/migrations/001_initial_schema.sql'),
    'utf8'
  )
  await pool.query(sql)
  await pool.end()
}
