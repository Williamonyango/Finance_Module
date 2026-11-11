const express = require('express')
const { loadAuthenticatedUser } = require('../middleware/requireAuth')
const validators = require('../validators/contributionValidators')
const service = require('../services/contributionService')

const router = express.Router()
router.use(loadAuthenticatedUser)

router.get('/', async (request, response, next) => {
  try {
    const filters = validators.parse(validators.filters, request.query)
    response.json({ success: true, data: await service.list(request.user, filters) })
  } catch (error) { next(error) }
})

router.post('/', async (request, response, next) => {
  try {
    const input = validators.parse(validators.create, request.body)
    response.status(201).json({ success: true, data: await service.create(request.user, input) })
  } catch (error) { next(error) }
})

router.get('/:contributionId', async (request, response, next) => {
  try {
    const contribution = await service.findById(request.params.contributionId, request.user)
    if (!contribution) {
      response.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested contribution was not found' } })
      return
    }
    response.json({ success: true, data: service.serialize ? service.serialize(contribution) : contribution })
  } catch (error) { next(error) }
})

router.patch('/:contributionId', async (request, response, next) => {
  try {
    const input = validators.parse(validators.update, request.body)
    response.json({ success: true, data: await service.update(request.user, request.params.contributionId, input) })
  } catch (error) { next(error) }
})

router.post('/:contributionId/void', async (request, response, next) => {
  try {
    const input = validators.parse(validators.voidContribution, request.body)
    response.json({ success: true, data: await service.voidContribution(request.user, request.params.contributionId, input.reason) })
  } catch (error) { next(error) }
})

module.exports = { contributionRoutes: router }
