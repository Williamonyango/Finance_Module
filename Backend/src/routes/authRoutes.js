const crypto = require('node:crypto')
const express = require('express')
const bcrypt = require('bcrypt')
const rateLimit = require('express-rate-limit')
const { pool } = require('../db/pool')
const env = require('../config/env')
const { AppError } = require('../errors/AppError')
const { ensureCsrfToken } = require('../middleware/csrf')
const { loadAuthenticatedUser } = require('../middleware/requireAuth')
const { serializeUser } = require('../serializers/userSerializer')

const router = express.Router()

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMITED',
      message: 'Too many login attempts. Try again later.',
    },
  },
})

function requireString(value, field, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new AppError(422, 'VALIDATION_ERROR', `${field} is required and must be valid`)
  }
  return value.trim()
}

function saveSession(request) {
  return new Promise((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()))
  })
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
}

function destroySession(request) {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => (error ? reject(error) : resolve()))
  })
}

async function writeAuditLog(connection, userId, parishId, action, entityId, metadata = null) {
  await connection.query(
    `INSERT INTO audit_logs (id, user_id, parish_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, 'user', ?, ?)`,
    [crypto.randomUUID(), userId, parishId, action, entityId, metadata ? JSON.stringify(metadata) : null],
  )
}

router.post('/login', loginRateLimit, async (request, response, next) => {
  try {
    const email = requireString(request.body?.email, 'Email', 254).toLowerCase()
    const password = requireString(request.body?.password, 'Password', 200)
    const [rows] = await pool.query(
      `SELECT id, parish_id, centre_id, group_id, name, email, password_hash, role, status
       FROM users WHERE email = ? LIMIT 1`,
      [email],
    )
    const user = rows[0]
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!user || !passwordMatches || user.status !== 'active') {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
    }

    await regenerateSession(request)
    request.session.userId = user.id
    request.session.csrfToken = crypto.randomBytes(32).toString('hex')
    await saveSession(request)

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id])
      await writeAuditLog(connection, user.id, user.parish_id, 'login', user.id)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    response.json({
      success: true,
      data: {
        user: serializeUser(user),
        csrfToken: request.session.csrfToken,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/csrf', (request, response, next) => {
  ensureCsrfToken(request)
  request.session.save((error) => {
    if (error) {
      next(error)
      return
    }
    response.json({ success: true, data: { csrfToken: request.session.csrfToken } })
  })
})

router.get('/me', loadAuthenticatedUser, (request, response) => {
  response.json({ success: true, data: { user: serializeUser(request.user) } })
})

router.post('/logout', loadAuthenticatedUser, async (request, response, next) => {
  try {
    const connection = await pool.getConnection()
    try {
      await writeAuditLog(connection, request.user.id, request.user.parish_id, 'logout', request.user.id)
    } finally {
      connection.release()
    }
    await destroySession(request)
    response.clearCookie(env.session.cookieName)
    response.json({ success: true, data: { message: 'Logged out successfully' } })
  } catch (error) {
    next(error)
  }
})

router.patch('/password', loadAuthenticatedUser, async (request, response, next) => {
  try {
    const currentPassword = requireString(request.body?.currentPassword, 'Current password', 200)
    const newPassword = requireString(request.body?.newPassword, 'New password', 200)
    if (newPassword.length < 8) {
      throw new AppError(422, 'VALIDATION_ERROR', 'New password must be at least 8 characters')
    }
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [request.user.id])
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect')
    }
    const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds)
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, request.user.id])
      await writeAuditLog(connection, request.user.id, request.user.parish_id, 'password_change', request.user.id)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    await destroySession(request)
    response.clearCookie(env.session.cookieName)
    response.json({ success: true, data: { message: 'Password changed; please log in again' } })
  } catch (error) {
    next(error)
  }
})

module.exports = { authRoutes: router }
