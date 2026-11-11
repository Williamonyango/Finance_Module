const dotenv = require('dotenv')
const crypto = require('node:crypto')

dotenv.config()

function requiredNumber(name, fallback) {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (origins.length === 0) {
  throw new Error('FRONTEND_ORIGINS must contain at least one origin')
}

const nodeEnv = process.env.NODE_ENV || 'development'
const sessionSecret = process.env.SESSION_SECRET || (nodeEnv === 'development'
  ? crypto.randomBytes(32).toString('hex')
  : null)

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required outside development')
}

module.exports = {
  nodeEnv,
  port: requiredNumber('PORT', 3000),
  host: process.env.HOST || '127.0.0.1',
  frontendOrigins: origins,
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  session: {
    secret: sessionSecret,
    cookieName: process.env.SESSION_COOKIE_NAME || 'finance_erp_session',
    maxAgeMs: requiredNumber('SESSION_MAX_AGE_MS', 86400000),
    secure: nodeEnv === 'production',
  },
  bcryptRounds: requiredNumber('BCRYPT_ROUNDS', 12),
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: requiredNumber('DB_PORT', 3306),
    database: process.env.DB_NAME || 'finance_erp',
    user: process.env.DB_USER || 'finance_erp',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: requiredNumber('DB_CONNECTION_LIMIT', 10),
  },
}
