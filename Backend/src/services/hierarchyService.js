const bcrypt = require('bcrypt')
const crypto = require('node:crypto')
const { pool } = require('../db/pool')
const env = require('../config/env')
const { AppError } = require('../errors/AppError')

const definitions = {
  parishes: {
    table: 'parishes',
    singular: 'parish',
    columns: ['id', 'name', 'code', 'location', 'priest', 'status', 'created_at', 'updated_at'],
  },
  centres: {
    table: 'centres',
    singular: 'centre',
    columns: ['id', 'parish_id', 'name', 'location', 'status', 'created_at', 'updated_at'],
  },
  groups: {
    table: '`groups`',
    singular: 'group',
    columns: ['id', 'parish_id', 'centre_id', 'name', 'status', 'created_at', 'updated_at'],
  },
  members: {
    table: 'members',
    singular: 'member',
    columns: ['id', 'parish_id', 'centre_id', 'group_id', 'name', 'phone', 'status', 'created_at', 'updated_at'],
  },
}

function definition(resource) {
  const value = definitions[resource]
  if (!value) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Unknown hierarchy resource')
  return value
}

function serialize(resource, row) {
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result
}

function accessConditions(resource, user, aliases = '') {
  const prefix = aliases ? `${aliases}.` : ''
  if (resource === 'parishes') {
    return user.role === 'owner' ? { sql: '', values: [] } : {
      sql: ` AND ${prefix}id = ?`,
      values: [user.parish_id],
    }
  }
  if (user.role === 'owner') return { sql: '', values: [] }
  const conditions = [`${prefix}parish_id = ?`]
  const values = [user.parish_id]
  if ((resource === 'groups' || resource === 'members') && (user.role === 'centre' || user.role === 'group')) {
    conditions.push(`${prefix}centre_id = ?`)
    values.push(user.centre_id)
  }
  if (resource === 'members' && user.role === 'group') {
    conditions.push(`${prefix}group_id = ?`)
    values.push(user.group_id)
  }
  if (resource === 'groups' && user.role === 'group') {
    conditions.push(`${prefix}id = ?`)
    values.push(user.group_id)
  }
  if (resource === 'centres' && (user.role === 'centre' || user.role === 'group')) {
    conditions.push(`${prefix}id = ?`)
    values.push(user.centre_id)
  }
  return { sql: ` AND ${conditions.join(' AND ')}`, values }
}

function canManage(resource, user) {
  return {
    parishes: user.role === 'owner',
    centres: user.role === 'parish',
    groups: user.role === 'centre',
    members: user.role === 'group',
  }[resource]
}

function mapDatabaseError(error, resource) {
  if (error.code === 'ER_DUP_ENTRY') {
    return new AppError(409, 'DUPLICATE_RESOURCE', `A ${definition(resource).singular} with those unique values already exists`)
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
    return new AppError(409, 'RESOURCE_HAS_CHILDREN', `The ${definition(resource).singular} cannot be deleted while it has child records`)
  }
  return error
}

async function findById(resource, id, user, connection = pool) {
  const def = definition(resource)
  const access = accessConditions(resource, user, 'r')
  const [rows] = await connection.query(
    `SELECT ${def.columns.map((column) => `r.${column}`).join(', ')}
     FROM ${def.table} r WHERE r.id = ?${access.sql} LIMIT 1`,
    [id, ...access.values],
  )
  return rows[0] || null
}

async function list(resource, user, filters) {
  const def = definition(resource)
  const page = Math.max(1, Number(filters.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25))
  const conditions = ['1 = 1']
  const values = []
  const access = accessConditions(resource, user, 'r')
  if (access.sql) conditions.push(access.sql.replace(/^ AND /, ''))
  values.push(...access.values)
  if (filters.status) {
    conditions.push('r.status = ?')
    values.push(filters.status)
  }
  if (filters.q) {
    const searchColumns = resource === 'parishes' ? ['r.name', 'r.code'] : ['r.name']
    conditions.push(`(${searchColumns.map((column) => `${column} LIKE ?`).join(' OR ')})`)
    values.push(...searchColumns.map(() => `%${filters.q}%`))
  }
  const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM ${def.table} r WHERE ${conditions.join(' AND ')}`, values)
  const offset = (page - 1) * pageSize
  const [rows] = await pool.query(
    `SELECT ${def.columns.map((column) => `r.${column}`).join(', ')}
     FROM ${def.table} r WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset],
  )
  return {
    items: rows.map((row) => serialize(resource, row)),
    pagination: { page, pageSize, total: Number(count.total), totalPages: Math.ceil(Number(count.total) / pageSize) },
  }
}

async function audit(connection, user, action, resource, entityId, metadata = null) {
  await connection.query(
    `INSERT INTO audit_logs (id, user_id, parish_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), user.id, user.parish_id, action, resource, entityId, metadata ? JSON.stringify(metadata) : null],
  )
}

async function create(resource, user, input) {
  if (!canManage(resource, user)) throw new AppError(403, 'FORBIDDEN', `You cannot create ${definition(resource).singular} records`)
  if (resource === 'groups' && (
    (input.parishId && input.parishId !== user.parish_id)
    || (input.centreId && input.centreId !== user.centre_id)
  )) {
    throw new AppError(422, 'INVALID_HIERARCHY', 'Group hierarchy IDs must match the authenticated centre scope')
  }
  if (resource === 'members' && (
    (input.parishId && input.parishId !== user.parish_id)
    || (input.centreId && input.centreId !== user.centre_id)
    || (input.groupId && input.groupId !== user.group_id)
  )) {
    throw new AppError(422, 'INVALID_HIERARCHY', 'Member hierarchy IDs must match the authenticated group scope')
  }
  const connection = await pool.getConnection()
  const id = crypto.randomUUID()
  try {
    await connection.beginTransaction()
    let row
    if (resource === 'parishes') {
      const passwordHash = await bcrypt.hash(input.administrator.password, env.bcryptRounds)
      await connection.query(
        'INSERT INTO parishes (id, name, code, location, priest) VALUES (?, ?, ?, ?, ?)',
        [id, input.name, input.code, input.location || null, input.priest || null],
      )
      await connection.query(
        `INSERT INTO users (id, parish_id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, ?, 'parish')`,
        [crypto.randomUUID(), id, input.administrator.name, input.administrator.email.toLowerCase(), passwordHash],
      )
      row = await findById(resource, id, user, connection)
    } else {
      const parishId = user.parish_id
      const centreId = resource === 'groups' ? user.centre_id : user.centre_id
      const groupId = resource === 'members' ? user.group_id : null
      if (resource === 'centres') {
        await assertParent(connection, 'parishes', parishId)
        await connection.query('INSERT INTO centres (id, parish_id, name, location) VALUES (?, ?, ?, ?)', [id, parishId, input.name, input.location || null])
        const passwordHash = await bcrypt.hash(input.administrator.password, env.bcryptRounds)
        await connection.query(
          `INSERT INTO users (id, parish_id, centre_id, name, email, password_hash, role)
           VALUES (?, ?, ?, ?, ?, ?, 'centre')`,
          [crypto.randomUUID(), parishId, id, input.administrator.name, input.administrator.email.toLowerCase(), passwordHash],
        )
      } else if (resource === 'groups') {
        await assertParent(connection, 'centres', centreId, parishId)
        await connection.query('INSERT INTO `groups` (id, parish_id, centre_id, name) VALUES (?, ?, ?, ?)', [id, parishId, centreId, input.name])
        const passwordHash = await bcrypt.hash(input.administrator.password, env.bcryptRounds)
        await connection.query(
          `INSERT INTO users (id, parish_id, centre_id, group_id, name, email, password_hash, role)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'group')`,
          [crypto.randomUUID(), parishId, centreId, id, input.administrator.name, input.administrator.email.toLowerCase(), passwordHash],
        )
      } else {
        await assertParent(connection, 'groups', groupId, parishId, user.centre_id)
        await connection.query('INSERT INTO members (id, parish_id, centre_id, group_id, name, phone) VALUES (?, ?, ?, ?, ?, ?)', [id, user.parish_id, user.centre_id, user.group_id, input.name, input.phone || null])
      }
      row = await findById(resource, id, user, connection)
    }
    await audit(connection, user, 'create', resource, id)
    await connection.commit()
    return serialize(resource, row)
  } catch (error) {
    await connection.rollback()
    throw mapDatabaseError(error, resource)
  } finally {
    connection.release()
  }
}

async function assertParent(connection, resource, id, ...scope) {
  const table = definition(resource).table
  const conditions = ['id = ?']
  const values = [id]
  if (scope[0]) {
    conditions.push('parish_id = ?')
    values.push(scope[0])
  }
  if (scope[1]) {
    conditions.push('centre_id = ?')
    values.push(scope[1])
  }
  const [rows] = await connection.query(`SELECT id FROM ${table} WHERE ${conditions.join(' AND ')} LIMIT 1`, values)
  if (!rows.length) throw new AppError(422, 'INVALID_HIERARCHY', `The selected ${definition(resource).singular} is not valid for this scope`)
}

async function deleteParishCascade(connection, parishId) {
  await connection.query('DELETE FROM contributions WHERE parish_id = ?', [parishId])
  await connection.query('DELETE FROM audit_logs WHERE parish_id = ?', [parishId])
  await connection.query('DELETE FROM users WHERE parish_id = ?', [parishId])
  await connection.query('DELETE FROM members WHERE parish_id = ?', [parishId])
  await connection.query('DELETE FROM `groups` WHERE parish_id = ?', [parishId])
  await connection.query('DELETE FROM centres WHERE parish_id = ?', [parishId])
  await connection.query('DELETE FROM parishes WHERE id = ?', [parishId])
}

async function mutate(resource, id, user, action, input) {
  if (!canManage(resource, user)) throw new AppError(403, 'FORBIDDEN', `You cannot ${action} ${definition(resource).singular} records`)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const current = await findById(resource, id, user, connection)
    if (!current) throw new AppError(404, 'RESOURCE_NOT_FOUND', `The requested ${definition(resource).singular} was not found`)
    if (action === 'delete') {
      if (resource === 'parishes') await deleteParishCascade(connection, id)
      else await connection.query(`DELETE FROM ${definition(resource).table} WHERE id = ?`, [id])
    } else {
      const fields = action === 'status' ? { status: input.status } : input
      const entries = Object.entries(fields)
      const set = entries.map(([field]) => `${field} = ?`).join(', ')
      await connection.query(`UPDATE ${definition(resource).table} SET ${set} WHERE id = ?`, [...entries.map(([, value]) => value), id])
    }
    await audit(connection, user, action, resource, id, action === 'update' ? { old: current, new: input } : null)
    await connection.commit()
    return action === 'delete' ? null : serialize(resource, await findById(resource, id, user))
  } catch (error) {
    await connection.rollback()
    throw mapDatabaseError(error, resource)
  } finally {
    connection.release()
  }
}

module.exports = { create, definition, findById, list, mutate, canManage, serialize }
