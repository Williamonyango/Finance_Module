const { createApp } = require('./app')
const env = require('./config/env')
const { pool } = require('./db/pool')
const { sessionStore } = require('./middleware/session')

const app = createApp()
const server = app.listen(env.port, env.host, () => {
  console.log(`Finance ERP API listening on http://${env.host}:${env.port}`)
})

function shutDown(signal) {
  console.log(`${signal} received; shutting down`)
  server.close(async (error) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
    }
    await sessionStore.close()
    await pool.end()
  })
}

process.once('SIGINT', () => shutDown('SIGINT'))
process.once('SIGTERM', () => shutDown('SIGTERM'))
