const fs = require('node:fs/promises')
const path = require('node:path')
const { pool } = require('./pool')

async function seedDatabase() {
  const seedPath = path.resolve(__dirname, '../../seeders/001_development_seed.sql')
  const sql = await fs.readFile(seedPath, 'utf8')
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    for (const statement of statements) await connection.query(statement)
    await connection.commit()
    console.log('Development seed data inserted')
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

seedDatabase()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
