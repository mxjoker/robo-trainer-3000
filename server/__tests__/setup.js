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
    DROP TABLE IF EXISTS progress_photos CASCADE;
    DROP TABLE IF EXISTS push_subscriptions CASCADE;
    DROP TABLE IF EXISTS notification_preferences CASCADE;
    DROP TABLE IF EXISTS mobility_sets CASCADE;
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

  const sql2 = fs.readFileSync(
    path.join(__dirname, '../db/migrations/002_add_meds.sql'),
    'utf8'
  )
  await pool.query(sql2)

  const sql3 = fs.readFileSync(
    path.join(__dirname, '../db/migrations/003_add_push.sql'),
    'utf8'
  )
  await pool.query(sql3)

  const sql4 = fs.readFileSync(
    path.join(__dirname, '../db/migrations/004_add_mobility.sql'),
    'utf8'
  )
  await pool.query(sql4)

  const sql5 = fs.readFileSync(
    path.join(__dirname, '../db/migrations/005_add_photo_url.sql'),
    'utf8'
  )
  await pool.query(sql5)

  const sql6 = fs.readFileSync(
    path.join(__dirname, '../db/migrations/006_add_progress_photos.sql'),
    'utf8'
  )
  await pool.query(sql6)

  await pool.end()
}
