const { rollbackLast } = require('./migrationRunner')
const { pool } = require('./pool')

rollbackLast()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
