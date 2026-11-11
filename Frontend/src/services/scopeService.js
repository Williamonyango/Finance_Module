export const roles = {
  owner: { label: 'ERP Owner', scope: 'platform' },
  parish: { label: 'Parish Administrator', scope: 'parish' },
  centre: { label: 'Centre Administrator', scope: 'centre' },
  group: { label: 'Group Treasurer', scope: 'group' },
}

export function canAccessRecord(session, record) {
  if (!session || !record) return false
  if (session.role === 'owner') return true
  const recordParishId = record.parishId || (record.id === session.parishId ? record.id : null)
  if (session.parishId !== recordParishId) return false
  if (session.role === 'parish') return true
  if (session.centreId !== record.centreId) return false
  if (session.role === 'centre') return true
  return session.role === 'group' && session.groupId === record.groupId
}

export function assertCanAccessRecord(session, record, action = 'access this record') {
  if (!canAccessRecord(session, record)) {
    throw new Error(`You do not have permission to ${action}.`)
  }
}

export function assertCanCreate(session, entity, input) {
  if (!session || !roles[session.role]) throw new Error('A valid session is required.')
  if (session.role === 'owner' && entity === 'parishes') return
  if (entity === 'centres' && session.role === 'parish' && input.parishId === session.parishId) return
  if (entity === 'groups' && session.role === 'centre' && input.parishId === session.parishId && input.centreId === session.centreId) return
  if (entity === 'members' && session.role === 'group' && input.parishId === session.parishId && input.centreId === session.centreId && input.groupId === session.groupId) return
  if (entity === 'contributions' && ['parish', 'centre', 'group'].includes(session.role) && canAccessRecord(session, input)) return
  throw new Error(`You do not have permission to create ${entity}.`)
}

export function assertEntityMatchesHierarchy(entity, record, data) {
  const parentMap = {
    centres: ['parishId', 'parishes'],
    groups: ['centreId', 'centres', 'parishId', 'parishes'],
    members: ['groupId', 'groups', 'centreId', 'centres', 'parishId', 'parishes'],
    contributions: ['memberId', 'members', 'groupId', 'groups', 'centreId', 'centres', 'parishId', 'parishes'],
  }
  const fields = parentMap[entity] || []
  for (let index = 0; index < fields.length; index += 2) {
    const [field, parentEntity] = fields.slice(index, index + 2)
    if (record[field] && !data[parentEntity].some((parent) => parent.id === record[field])) {
      throw new Error(`The ${entity} record references an unknown ${field}.`)
    }
  }
  const relationships = {
    centres: [['parishId', 'parishes', 'id', 'parishId']],
    groups: [['centreId', 'centres', 'id', 'centreId'], ['parishId', 'centres', 'parishId', 'centreId']],
    members: [['groupId', 'groups', 'id', 'groupId'], ['centreId', 'groups', 'centreId', 'groupId'], ['parishId', 'groups', 'parishId', 'groupId']],
    contributions: [['memberId', 'members', 'id', 'memberId'], ['groupId', 'members', 'groupId', 'memberId'], ['centreId', 'members', 'centreId', 'memberId'], ['parishId', 'members', 'parishId', 'memberId']],
  }
  for (const [field, parentEntity, parentField, lookupField] of relationships[entity] || []) {
    const parent = data[parentEntity].find((item) => item.id === record[lookupField])
    if (parent && record[field] !== parent[parentField]) {
      throw new Error(`The ${entity} record does not match its parent hierarchy.`)
    }
  }
}
