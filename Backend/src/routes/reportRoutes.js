const express = require('express')
const { loadAuthenticatedUser } = require('../middleware/requireAuth')
const service = require('../services/dashboardService')
const { parse } = require('../validators/reportValidators')

const router = express.Router()
router.use(loadAuthenticatedUser)

router.get('/contributions.csv', async (request, response, next) => {
  try {
    const content = await service.csv(request.user, parse(request.query))
    response.type('text/csv').set('Content-Disposition', 'attachment; filename="contributions.csv"').send(content)
  } catch (error) { next(error) }
})

router.get('/contributions.summary', async (request, response, next) => {
  try {
    const filters = parse(request.query)
    const data = await service.dashboard(request.user, filters)
    response.json({ success: true, data: data.contributions })
  } catch (error) { next(error) }
})

for (const resource of ['parishes', 'centres', 'groups']) {
  router.get(`/${resource}/:id/summary`, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.summary(request.user, resource, request.params.id, parse(request.query)) })
    } catch (error) { next(error) }
  })
}

module.exports = { reportRoutes: router }
