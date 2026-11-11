const { z } = require('zod')

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD')
const filters = z.object({
  fromDate: date.optional(),
  toDate: date.optional(),
})

function parse(value) {
  const result = filters.safeParse(value)
  if (!result.success) {
    const error = new Error('Request validation failed')
    error.statusCode = 422
    error.code = 'VALIDATION_ERROR'
    error.details = result.error.issues
    error.isOperational = true
    throw error
  }
  return result.data
}

module.exports = { parse }
