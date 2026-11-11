const crypto = require('node:crypto')
const { pool } = require('../db/pool')
const { AppError } = require('../errors/AppError')

function serialize(row) {
  if (!row) return null
  return {
    id: row.id,
    parishId: row.parish_id,
    centreId: row.centre_id,
    groupId: row.group_id,
    memberId: row.member_id,
    memberName: row.member_name,
    amount: row.amount,
    currency: row.currency,
    category: row.category,
    date: row.contribution_date,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    status: row.status,
    createdBy: row.created_by,
    recordedAt: row.recorded_at,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function scopeConditions(user, alias = 'c') {
  const conditions = []
  const values = []
  if (user.role !== 'owner') {
    conditions.push(`${alias}.parish_id = ?`)
    values.push(user.parish_id)
  }
  if (user.role === 'centre' || user.role === 'group') {
    conditions.push(`${alias}.centre_id = ?`)
    values.push(user.centre_id)
  }
  if (user.role === 'group') {
    conditions.push(`${alias}.group_id = ?`)
    values.push(user.group_id)
  }
  return { conditions, values }
}

const selectColumns = `
  c.id, c.parish_id, c.centre_id, c.group_id, c.member_id, c.amount,
  c.currency, c.category, c.contribution_date, c.method, c.reference,
  c.notes, c.status, c.created_by, c.recorded_at, c.voided_by,
  c.voided_at, c.void_reason, c.created_at, c.updated_at, m.name AS member_name
`

async function findById(id, user, connection = pool) {
  const scope = scopeConditions(user)
  const [rows] = await connection.query(
    `SELECT ${selectColumns}
     FROM contributions c JOIN members m ON m.id = c.member_id
     WHERE c.id = ? ${scope.conditions.length ? `AND ${scope.conditions.join(' AND ')}` : ''}
     LIMIT 1`,
    [id, ...scope.values],
  )
  return rows[0] || null
}

async function list(user, filters) {
  const page = Math.max(1, Number(filters.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25))
  const scope = scopeConditions(user)
  const conditions = [...scope.conditions]
  const values = [...scope.values]
  const add = (condition, ...parameters) => {
    conditions.push(condition)
    values.push(...parameters)
  }
  if (filters.q) add('(m.name LIKE ? OR c.reference LIKE ? OR c.notes LIKE ?)', `%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`)
  if (filters.category) add('c.category = ?', filters.category)
  if (filters.method) add('c.method = ?', filters.method)
  if (filters.parishId) add('c.parish_id = ?', filters.parishId)
  if (filters.centreId) add('c.centre_id = ?', filters.centreId)
  if (filters.groupId) add('c.group_id = ?', filters.groupId)
  if (filters.memberId) add('c.member_id = ?', filters.memberId)
  if (filters.fromDate) add('c.contribution_date >= ?', filters.fromDate)
  if (filters.toDate) add('c.contribution_date <= ?', filters.toDate)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM contributions c JOIN members m ON m.id = c.member_id ${where}`,
    values,
  )
  const orderBy = {
    date_asc: 'c.contribution_date ASC, c.created_at ASC',
    amount_asc: 'c.amount ASC, c.created_at DESC',
    amount_desc: 'c.amount DESC, c.created_at DESC',
    date_desc: 'c.contribution_date DESC, c.created_at DESC',
  }[filters.sort] || 'c.contribution_date DESC, c.created_at DESC'
  const [rows] = await pool.query(
    `SELECT ${selectColumns}
     FROM contributions c JOIN members m ON m.id = c.member_id ${where}
     ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...values, pageSize, (page - 1) * pageSize],
  )
  return {
    items: rows.map(serialize),
    pagination: { page, pageSize, total: Number(count.total), totalPages: Math.ceil(Number(count.total) / pageSize) },
  }
}

async function audit(connection, user, action, id, metadata = null) {
  await connection.query(
    `INSERT INTO audit_logs (id, user_id, parish_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, 'contribution', ?, ?)`,
    [crypto.randomUUID(), user.id, user.parish_id, action, id, metadata ? JSON.stringify(metadata) : null],
  )
}

async function assertCanMutate(user) {
  if (!['parish', 'centre', 'group'].includes(user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'This role cannot modify contributions')
  }
}

async function create(user, input) {
  await assertCanMutate(user)
  const connection = await pool.getConnection()
  const id = crypto.randomUUID()
  try {
    await connection.beginTransaction()
    const scope = scopeConditions(user, 'm')
    const [members] = await connection.query(
      `SELECT m.id, m.parish_id, m.centre_id, m.group_id
       FROM members m WHERE m.id = ? ${scope.conditions.length ? `AND ${scope.conditions.join(' AND ')}` : ''}
       AND m.status = 'active' LIMIT 1`,
      [input.memberId, ...scope.values],
    )
    const member = members[0]
    if (!member) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'The requested member was not found')
    await connection.query(
      `INSERT INTO contributions
       (id, parish_id, centre_id, group_id, member_id, amount, category,
        contribution_date, method, reference, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, member.parish_id, member.centre_id, member.group_id, member.id, input.amount,
        input.category, input.date, input.method, input.reference || null, input.notes || null, user.id],
    )
    await audit(connection, user, 'create', id)
    await connection.commit()
    return serialize(await findById(id, user))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function update(user, id, input) {
  await assertCanMutate(user)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const current = await findById(id, user, connection)
    if (!current) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'The requested contribution was not found')
    if (current.status === 'voided') throw new AppError(409, 'CONTRIBUTION_VOIDED', 'Voided contributions cannot be updated')
    const fields = {
      amount: input.amount,
      category: input.category,
      method: input.method,
      reference: input.reference === undefined ? current.reference : input.reference,
      notes: input.notes === undefined ? current.notes : input.notes,
    }
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined)
    await connection.query(
      `UPDATE contributions SET ${entries.map(([field]) => `${field} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => value), id],
    )
    await audit(connection, user, 'update', id, { old: current, new: input })
    await connection.commit()
    return serialize(await findById(id, user))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function voidContribution(user, id, reason) {
  await assertCanMutate(user)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const current = await findById(id, user, connection)
    if (!current) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'The requested contribution was not found')
    if (current.status === 'voided') throw new AppError(409, 'CONTRIBUTION_VOIDED', 'Contribution is already voided')
    await connection.query(
      `UPDATE contributions
       SET status = 'voided', voided_by = ?, voided_at = CURRENT_TIMESTAMP, void_reason = ?
       WHERE id = ?`,
      [user.id, reason, id],
    )
    await audit(connection, user, 'void', id, { old: current, voidReason: reason })
    await connection.commit()
    return serialize(await findById(id, user))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { create, findById, list, serialize, update, voidContribution }
