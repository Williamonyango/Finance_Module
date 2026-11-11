const { AppError } = require('../errors/AppError')
const { pool } = require('../db/pool')

function requireRoles(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required'))
      return
    }
    if (!allowedRoles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'))
      return
    }
    next()
  }
}

function getTargetId(request, parameterName) {
  return request.params?.[parameterName] || request.body?.[parameterName] || request.query?.[parameterName]
}

function denyScopedResource(parameterName) {
  return new AppError(404, 'RESOURCE_NOT_FOUND', `The requested ${parameterName} was not found`)
}

async function checkParishAccess(user, parishId) {
  if (!parishId) return false
  if (user.role === 'owner') return true
  if (!user.parish_id || user.parish_id !== parishId) return false
  const [rows] = await pool.query('SELECT id FROM parishes WHERE id = ? AND status != ?', [parishId, 'suspended'])
  return rows.length === 1
}

async function checkCentreAccess(user, centreId) {
  if (!centreId) return false
  let query = `
    SELECT c.id
    FROM centres c
    WHERE c.id = ? AND c.status != ?
  `
  const parameters = [centreId, 'suspended']
  if (user.role !== 'owner') {
    query += ' AND c.parish_id = ?'
    parameters.push(user.parish_id)
  }
  if (user.role === 'centre' || user.role === 'group') {
    query += ' AND c.id = ?'
    parameters.push(user.centre_id)
  }
  const [rows] = await pool.query(query, parameters)
  return rows.length === 1
}

async function checkGroupAccess(user, groupId) {
  if (!groupId) return false
  let query = `
    SELECT g.id
    FROM \`groups\` g
    WHERE g.id = ? AND g.status != ?
  `
  const parameters = [groupId, 'suspended']
  if (user.role !== 'owner') {
    query += ' AND g.parish_id = ?'
    parameters.push(user.parish_id)
  }
  if (user.role === 'centre' || user.role === 'group') {
    query += ' AND g.centre_id = ?'
    parameters.push(user.centre_id)
  }
  if (user.role === 'group') {
    query += ' AND g.id = ?'
    parameters.push(user.group_id)
  }
  const [rows] = await pool.query(query, parameters)
  return rows.length === 1
}

function requireParishScope(parameterName = 'parishId') {
  return async (request, response, next) => {
    try {
      const parishId = getTargetId(request, parameterName)
      if (!(await checkParishAccess(request.user, parishId))) {
        throw denyScopedResource('parish')
      }
      request.scope = { ...(request.scope || {}), parishId }
      next()
    } catch (error) {
      next(error)
    }
  }
}

function requireCentreScope(parameterName = 'centreId') {
  return async (request, response, next) => {
    try {
      const centreId = getTargetId(request, parameterName)
      if (!(await checkCentreAccess(request.user, centreId))) {
        throw denyScopedResource('centre')
      }
      request.scope = { ...(request.scope || {}), centreId }
      next()
    } catch (error) {
      next(error)
    }
  }
}

function requireGroupScope(parameterName = 'groupId') {
  return async (request, response, next) => {
    try {
      const groupId = getTargetId(request, parameterName)
      if (!(await checkGroupAccess(request.user, groupId))) {
        throw denyScopedResource('group')
      }
      request.scope = { ...(request.scope || {}), groupId }
      next()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = {
  checkCentreAccess,
  checkGroupAccess,
  checkParishAccess,
  getTargetId,
  requireCentreScope,
  requireGroupScope,
  requireParishScope,
  requireRoles,
}
