const { AppError } = require('../errors/AppError')

function notFound(request, response, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${request.method} ${request.originalUrl} not found`))
}

module.exports = { notFound }
