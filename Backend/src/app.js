const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const env = require('./config/env')
const { healthRoutes } = require('./routes/healthRoutes')
const { notFound } = require('./middleware/notFound')
const { errorHandler } = require('./middleware/errorHandler')
const { sessionMiddleware } = require('./middleware/session')
const { csrfProtection } = require('./middleware/csrf')
const { authRoutes } = require('./routes/authRoutes')
const { hierarchyRoutes } = require('./routes/hierarchyRoutes')
const { contributionRoutes } = require('./routes/contributionRoutes')
const { dashboardRoutes } = require('./routes/dashboardRoutes')
const { reportRoutes } = require('./routes/reportRoutes')

function createApp() {
  const app = express()
  app.locals.environment = env.nodeEnv
  app.locals.logger = (error) => console.error(error)

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    origin: env.frontendOrigins,
    credentials: true,
  }))
  app.use(express.json({ limit: env.jsonBodyLimit }))
  app.use(sessionMiddleware)
  app.use(csrfProtection)
  app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }))

  app.get('/', (request, response) => {
    response.json({
      success: true,
      data: {
        name: 'Finance ERP API',
        version: 'v1',
      },
    })
  })
  app.use('/api/v1/health', healthRoutes)
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1', hierarchyRoutes)
  app.use('/api/v1/contributions', contributionRoutes)
  app.use('/api/v1/dashboard', dashboardRoutes)
  app.use('/api/v1/reports', reportRoutes)
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
