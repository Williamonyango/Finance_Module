const crypto = require('node:crypto')
const { AppError } = require('../errors/AppError')

const stateChangingMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

function ensureCsrfToken(request) {
  if (!request.session.csrfToken) {
    request.session.csrfToken = crypto.randomBytes(32).toString('hex')
  }
  return request.session.csrfToken
}

function csrfTokenRoute(request, response, next) {
  try {
    const token = ensureCsrfToken(request)
    request.session.save((error) => {
      if (error) {
        next(error)
        return
      }
      response.json({ success: true, data: { csrfToken: token } })
    })
  } catch (error) {
    next(error)
  }
}

function csrfProtection(request, response, next) {
  if (!stateChangingMethods.has(request.method)) {
    next()
    return
  }

  const expected = request.session?.csrfToken
  const received = request.get('X-CSRF-Token')
  if (
    !expected
    || !received
    || expected.length !== received.length
    || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  ) {
    next(new AppError(403, 'CSRF_INVALID', 'A valid CSRF token is required'))
    return
  }
  next()
}

module.exports = { csrfProtection, csrfTokenRoute, ensureCsrfToken }
