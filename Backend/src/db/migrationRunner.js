const fs = require('node:fs/promises')
const path = require('node:path')
const { pool } = require('./pool')

const migrationsDirectory = path.resolve(__dirname, '../../migrations')

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `)
}

async function migrationFiles(down = false) {
  const suffix = down ? '.down.sql' : '.sql'
  const files = await fs.readdir(migrationsDirectory)
  return files
    .filter((file) => file.endsWith(suffix) && !file.startsWith('001_initial_schema.down'))
    .sort()
}

async function migrate() {
  const connection = await pool.getConnection()
  try {
    await ensureMigrationsTable(connection)
    const [appliedRows] = await connection.query('SELECT name FROM schema_migrations')
    const applied = new Set(appliedRows.map((row) => row.name))
    for (const file of await migrationFiles()) {
      const migrationName = file.replace(/\.sql$/, '')
      if (applied.has(migrationName)) continue
      for (const statement of splitStatements(await fs.readFile(path.join(migrationsDirectory, file), 'utf8'))) {
        await connection.query(statement)
      }
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [migrationName])
      console.log(`Applied migration ${migrationName}`)
    }
  } finally {
    connection.release()
  }
}

async function rollbackLast() {
  const connection = await pool.getConnection()
  try {
    await ensureMigrationsTable(connection)
    const [[last]] = await connection.query(
      'SELECT name FROM schema_migrations ORDER BY applied_at DESC, name DESC LIMIT 1',
    )
    if (!last) {
      console.log('No migrations to roll back')
      return
    }
    const file = `${last.name}.down.sql`
    const sql = await fs.readFile(path.join(migrationsDirectory, file), 'utf8')
    for (const statement of splitStatements(sql)) await connection.query(statement)
    await connection.query('DELETE FROM schema_migrations WHERE name = ?', [last.name])
    console.log(`Rolled back migration ${last.name}`)
  } finally {
    connection.release()
  }
}

module.exports = { migrate, rollbackLast }
