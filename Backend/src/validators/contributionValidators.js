const { z } = require('zod')

const uuid = z.string().uuid()
const method = z.enum(['cash', 'm_pesa', 'bank_transfer', 'cheque', 'other'])
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD')
const amount = z.union([
  z.number().finite().positive(),
  z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Amount must be a positive decimal'),
])

const create = z.object({
  memberId: uuid,
  amount,
  category: z.string().trim().min(1).max(50),
  date,
  method,
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const update = create.omit({ memberId: true, date: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
)

const filters = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  method: method.optional(),
  parishId: uuid.optional(),
  centreId: uuid.optional(),
  groupId: uuid.optional(),
  memberId: uuid.optional(),
  fromDate: date.optional(),
  toDate: date.optional(),
  sort: z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc']).optional(),
})

const voidContribution = z.object({
  reason: z.string().trim().min(1).max(500),
})

function parse(schema, value) {
  const result = schema.safeParse(value)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }))
    const error = new Error('Request validation failed')
    error.statusCode = 422
    error.code = 'VALIDATION_ERROR'
    error.details = details
    error.isOperational = true
    throw error
  }
  return result.data
}

module.exports = { create, filters, parse, update, voidContribution }
