const express = require('express')
const { loadAuthenticatedUser } = require('../middleware/requireAuth')
const { requireRoles } = require('../middleware/authorization')
const service = require('../services/dashboardService')
const { parse } = require('../validators/reportValidators')

const router = express.Router()
router.use(loadAuthenticatedUser)

function dashboardRoute(role) {
  return [
    requireRoles(role),
    async (request, response, next) => {
      try {
        response.json({ success: true, data: await service.dashboard(request.user, parse(request.query)) })
      } catch (error) { next(error) }
    },
  ]
}

router.get('/owner', ...dashboardRoute('owner'))
router.get('/parish', ...dashboardRoute('parish'))
router.get('/centre', ...dashboardRoute('centre'))
router.get('/group', ...dashboardRoute('group'))

module.exports = { dashboardRoutes: router }
