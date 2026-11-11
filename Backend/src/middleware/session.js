const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const env = require('../config/env')
const { pool } = require('../db/pool')

const sessionStore = new MySQLStore({
  clearExpired: true,
  expiration: env.session.maxAgeMs,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
}, pool)

const sessionMiddleware = session({
  name: env.session.cookieName,
  secret: env.session.secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.session.secure,
    sameSite: 'lax',
    maxAge: env.session.maxAgeMs,
  },
})

module.exports = { sessionMiddleware, sessionStore }
