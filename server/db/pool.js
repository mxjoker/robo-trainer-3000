const { Pool } = require('pg')

const connectionString = process.env.NODE_ENV === 'test'
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    `Missing env var: ${process.env.NODE_ENV === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL'}`
  )
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

module.exports = { pool }
