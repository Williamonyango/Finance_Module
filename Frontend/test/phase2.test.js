import assert from 'node:assert/strict'
import test from 'node:test'
import { authenticateDemoAccount, initialMockData } from '../src/data/mockData.js'
import { createDataService } from '../src/services/dataService.js'
import { canAccessRecord } from '../src/services/scopeService.js'
import { loadMockData, resetMockData, saveMockData, STORAGE_KEY } from '../src/services/storageService.js'
import { authenticateAccount } from '../src/services/authService.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
}

const owner = authenticateDemoAccount('owner@parishledger.org', 'owner-demo')
const parishAdmin = authenticateDemoAccount('admin.stmary@parishledger.org', 'parish-demo')
const centreAdmin = authenticateDemoAccount('admin.central@parishledger.org', 'centre-demo')
const groupAdmin = authenticateDemoAccount('treasurer.stpeter@parishledger.org', 'group-demo')

test('demo accounts produce scoped sessions without passwords', () => {
  assert.equal(owner.role, 'owner')
  assert.equal(parishAdmin.activeTenantId, 'parish-st-mary')
  assert.equal(groupAdmin.groupId, 'group-st-peter')
  assert.equal(Object.hasOwn(owner, 'password'), false)
})

test('data service scopes each hierarchy level', () => {
  const service = createDataService({ storage: memoryStorage() })
  assert.equal(service.list('parishes', owner).length, 3)
  assert.equal(service.list('parishes', parishAdmin).length, 1)
  assert.equal(service.list('centres', parishAdmin).length, 2)
  assert.equal(service.list('groups', centreAdmin).length, 2)
  assert.equal(service.list('members', groupAdmin).length, 3)
  assert.equal(service.list('contributions', groupAdmin).length, 2)
  assert.throws(() => service.list('contributions', owner), /permission/)
  assert.throws(() => service.create('contributions', { memberId: 'member-mary-wanjiku', amount: 100, parishId: 'parish-st-mary' }, owner), /permission/)
  assert.throws(() => service.getById('parishes', 'parish-holy-cross', parishAdmin), /permission/)
})

test('cross-tenant reads and writes are rejected', () => {
  const service = createDataService({ storage: memoryStorage() })
  assert.throws(() => service.getById('parishes', 'parish-holy-cross', parishAdmin), /permission/)
  assert.throws(() => service.update('centres', 'centre-kiambu', { name: 'No access' }, parishAdmin), /permission/)
  assert.throws(() => service.create('groups', { parishId: 'parish-holy-cross', centreId: 'centre-kiambu', name: 'Unsafe', status: 'active' }, centreAdmin), /permission/)
  assert.throws(() => service.remove('members', 'member-sarah-akinyi', groupAdmin), /permission/)
})

test('hierarchy relationships remain valid when creating records', () => {
  const service = createDataService({ storage: memoryStorage() })
  assert.throws(() => service.create('groups', { parishId: 'parish-st-mary', centreId: 'centre-kiambu', name: 'Mismatch', status: 'active' }, centreAdmin), /hierarchy/)
  const created = service.create('members', { parishId: 'parish-st-mary', centreId: 'centre-central', groupId: 'group-st-peter', name: 'New Member', phone: '0700 000 000', status: 'active' }, groupAdmin)
  assert.equal(created.name, 'New Member')
  assert.equal(service.list('members', groupAdmin).length, 4)
})

test('mock data has complete relationships', () => {
  for (const centre of initialMockData.centres) assert.ok(initialMockData.parishes.some((parish) => parish.id === centre.parishId))
  for (const group of initialMockData.groups) assert.ok(initialMockData.centres.some((centre) => centre.id === group.centreId && centre.parishId === group.parishId))
  for (const member of initialMockData.members) assert.ok(initialMockData.groups.some((group) => group.id === member.groupId && group.centreId === member.centreId && group.parishId === member.parishId))
  assert.equal(canAccessRecord(groupAdmin, initialMockData.members[4]), false)
})

test('group administrators can mutate only their members and contributions', () => {
  const service = createDataService({ storage: memoryStorage() })
  const member = service.create('members', {
    parishId: 'parish-st-mary',
    centreId: 'centre-central',
    groupId: 'group-st-peter',
    name: 'Group Test Member',
    phone: '0700 123 456',
    status: 'active',
  }, groupAdmin)
  const contribution = service.create('contributions', {
    parishId: 'parish-st-mary',
    centreId: 'centre-central',
    groupId: 'group-st-peter',
    memberId: member.id,
    amount: 2500,
    category: 'tithes',
    date: '2026-10-26',
    method: 'Cash',
    reference: 'GROUP-TEST',
  }, groupAdmin)
  assert.equal(service.update('contributions', contribution.id, { amount: 3000 }, groupAdmin).amount, 3000)
  assert.throws(() => service.update('members', 'member-sarah-akinyi', { name: 'Blocked' }, groupAdmin), /permission/)
  assert.throws(() => service.remove('contributions', 'contribution-004', groupAdmin), /permission/)
})

test('mock storage persists changes and can be reset', () => {
  const storage = memoryStorage()
  const service = createDataService({ storage })
  service.create('parishes', { name: 'QA Parish', code: 'QA-001', location: 'Nairobi', status: 'active', priest: 'Fr. QA' }, owner)
  assert.equal(loadMockData(storage).parishes.length, initialMockData.parishes.length + 1)
  assert.ok(storage.getItem(STORAGE_KEY))
  resetMockData(storage)
  assert.deepEqual(loadMockData(storage), initialMockData)
  saveMockData({ ...initialMockData, parishes: [] }, storage)
  assert.equal(loadMockData(storage).parishes.length, 0)
})

test('created parish, centre, and group credentials authenticate their scoped sessions', () => {
  const storage = memoryStorage()
  const service = createDataService({ storage })
  const parish = service.create('parishes', { name: 'Login Parish', code: 'LOG-001', location: 'Nairobi', status: 'active', priest: 'Fr. Login', email: 'parish.login@example.com', password: 'parish-secret' }, owner)
  const parishSession = { ...parish, role: 'parish', parishId: parish.id }
  const centre = service.create('centres', { parishId: parish.id, name: 'Login Centre', location: 'CBD', status: 'active', email: 'centre.login@example.com', password: 'centre-secret' }, parishSession)
  const group = service.create('groups', { parishId: parish.id, centreId: centre.id, name: 'Login Group', status: 'active', email: 'group.login@example.com', password: 'group-secret' }, { ...parishSession, role: 'centre', centreId: centre.id })

  assert.equal(authenticateAccount(parish.email, parish.password, storage).parishId, parish.id)
  assert.equal(authenticateAccount(centre.email, centre.password, storage).centreId, centre.id)
  assert.equal(authenticateAccount(group.email, group.password, storage).groupId, group.id)
})

test('deleting a parent cascades to its descendants without orphan records', () => {
  const service = createDataService({ storage: memoryStorage() })
  service.remove('groups', 'group-st-peter', centreAdmin)
  const groupScoped = service.list('groups', centreAdmin)
  const memberScoped = service.list('members', centreAdmin)
  const contributionScoped = service.list('contributions', centreAdmin)
  assert.equal(groupScoped.some((item) => item.id === 'group-st-peter'), false)
  assert.equal(memberScoped.some((item) => item.groupId === 'group-st-peter'), false)
  assert.equal(contributionScoped.some((item) => item.groupId === 'group-st-peter'), false)
})
