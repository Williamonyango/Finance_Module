const assert = require('node:assert/strict')
const test = require('node:test')
const { pool } = require('../src/db/pool')
const {
  checkCentreAccess,
  checkGroupAccess,
  checkParishAccess,
} = require('../src/middleware/authorization')

const owner = {
  role: 'owner',
  parish_id: null,
  centre_id: null,
  group_id: null,
}
const parishAdmin = {
  role: 'parish',
  parish_id: '11111111-1111-4111-8111-111111111111',
  centre_id: null,
  group_id: null,
}
const centreAdmin = {
  role: 'centre',
  parish_id: '11111111-1111-4111-8111-111111111111',
  centre_id: '11111111-1111-4111-8111-111111111112',
  group_id: null,
}
const groupTreasurer = {
  role: 'group',
  parish_id: '11111111-1111-4111-8111-111111111111',
  centre_id: '11111111-1111-4111-8111-111111111112',
  group_id: '11111111-1111-4111-8111-111111111114',
}

test.after(() => pool.end())

test('authorization enforces parish, centre, and group scope', async () => {
  assert.equal(await checkParishAccess(owner, '22222222-2222-4222-8222-222222222222'), true)
  assert.equal(await checkParishAccess(parishAdmin, '11111111-1111-4111-8111-111111111111'), true)
  assert.equal(await checkParishAccess(parishAdmin, '22222222-2222-4222-8222-222222222222'), false)
  assert.equal(await checkCentreAccess(parishAdmin, '11111111-1111-4111-8111-111111111113'), true)
  assert.equal(await checkCentreAccess(centreAdmin, '11111111-1111-4111-8111-111111111113'), false)
  assert.equal(await checkGroupAccess(centreAdmin, '11111111-1111-4111-8111-111111111114'), true)
  assert.equal(await checkGroupAccess(groupTreasurer, '22222222-2222-4222-8222-222222222224'), false)
})
