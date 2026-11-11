function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error)
    return
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500
  const isClientError = statusCode >= 400 && statusCode < 500
  const exposeMessage = isClientError || error.isOperational

  if (!isClientError) {
    request.app.locals.logger(error)
  }

  const body = {
    success: false,
    error: {
      code: error.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: exposeMessage ? error.message : 'An unexpected server error occurred',
    },
  }

  if (error.details !== undefined && isClientError) {
    body.error.details = error.details
  }

  response.status(statusCode).json(body)
}

module.exports = { errorHandler }
