const express = require('express')
const { checkDatabaseConnection } = require('../db/pool')
const { AppError } = require('../errors/AppError')

const router = express.Router()

router.get('/', async (request, response, next) => {
  try {
    await checkDatabaseConnection()
    response.json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        environment: request.app.locals.environment,
      },
    })
  } catch (error) {
    request.app.locals.logger({
      message: 'Database health check failed',
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    })
    next(new AppError(503, 'DATABASE_UNAVAILABLE', 'Database connectivity check failed'))
  }
})

module.exports = { healthRoutes: router }
