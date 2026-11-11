const { migrate } = require('./migrationRunner')
const { pool } = require('./pool')

migrate()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
