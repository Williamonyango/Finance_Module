const { pool } = require('../db/pool')
const { AppError } = require('../errors/AppError')

async function loadAuthenticatedUser(request, response, next) {
  try {
    if (!request.session.userId) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required')
    }

    const [rows] = await pool.query(
      `SELECT id, parish_id, centre_id, group_id, name, email, role, status
       FROM users WHERE id = ? LIMIT 1`,
      [request.session.userId],
    )
    const user = rows[0]
    if (!user || user.status !== 'active') {
      request.session.destroy(() => {})
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required')
    }

    request.user = user
    request.auth = {
      userId: user.id,
      role: user.role,
      parishId: user.parish_id,
      centreId: user.centre_id,
      groupId: user.group_id,
    }
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { loadAuthenticatedUser }
