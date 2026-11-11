const mysql = require('mysql2/promise')
const env = require('../config/env')

const pool = mysql.createPool({
  ...env.database,
  waitForConnections: true,
  connectionLimit: env.database.connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  dateStrings: true,
})

async function checkDatabaseConnection() {
  const connection = await pool.getConnection()
  try {
    await connection.query('SELECT 1')
  } finally {
    connection.release()
  }
}

module.exports = { pool, checkDatabaseConnection }
