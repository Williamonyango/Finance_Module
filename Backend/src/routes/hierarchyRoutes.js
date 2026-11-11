const express = require('express')
const { loadAuthenticatedUser } = require('../middleware/requireAuth')
const { requireRoles } = require('../middleware/authorization')
const { AppError } = require('../errors/AppError')
const validators = require('../validators/hierarchyValidators')
const service = require('../services/hierarchyService')

const router = express.Router()
router.use(loadAuthenticatedUser)

const resourceConfig = {
  parishes: { roles: ['owner'], create: validators.parishCreate, update: validators.parishUpdate },
  centres: { roles: ['parish'], create: validators.scopedCreate, update: validators.update },
  groups: { roles: ['centre'], create: validators.groupCreate, update: validators.update },
  members: { roles: ['group'], create: validators.memberCreate, update: validators.update },
}

function routeFor(resource) {
  const config = resourceConfig[resource]
  const route = express.Router()
  route.use(requireRoles('owner', 'parish', 'centre', 'group'))
  route.get('/', async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.list(resource, request.user, request.query) })
    } catch (error) { next(error) }
  })
  route.post('/', requireRoles(...config.roles), async (request, response, next) => {
    try {
      const input = validators.parse(config.create, request.body)
      response.status(201).json({ success: true, data: await service.create(resource, request.user, input) })
    } catch (error) { next(error) }
  })
  route.get('/:id', async (request, response, next) => {
    try {
      const row = await service.findById(resource, request.params.id, request.user)
      if (!row) throw new AppError(404, 'RESOURCE_NOT_FOUND', `The requested ${service.definition(resource).singular} was not found`)
      response.json({ success: true, data: service.serialize ? service.serialize(resource, row) : row })
    } catch (error) { next(error) }
  })
  route.patch('/:id', requireRoles(...config.roles), async (request, response, next) => {
    try {
      const input = validators.parse(config.update, request.body)
      response.json({ success: true, data: await service.mutate(resource, request.params.id, request.user, 'update', input) })
    } catch (error) { next(error) }
  })
  route.patch('/:id/status', requireRoles(...config.roles), async (request, response, next) => {
    try {
      const input = validators.parse(validators.statusUpdate, request.body)
      response.json({ success: true, data: await service.mutate(resource, request.params.id, request.user, 'status', input) })
    } catch (error) { next(error) }
  })
  route.delete('/:id', requireRoles(...config.roles), async (request, response, next) => {
    try {
      await service.mutate(resource, request.params.id, request.user, 'delete', {})
      response.status(204).send()
    } catch (error) { next(error) }
  })
  return route
}

router.use('/parishes', routeFor('parishes'))
router.use('/centres', routeFor('centres'))
router.use('/groups', routeFor('groups'))
router.use('/members', routeFor('members'))

module.exports = { hierarchyRoutes: router }
