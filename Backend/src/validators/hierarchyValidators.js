const { z } = require('zod')

const uuid = z.string().uuid()
const status = z.enum(['active', 'inactive', 'suspended'])
const name = z.string().trim().min(1).max(150)
const administrator = z.object({
  name,
  username: z.string().regex(/^[a-z0-9]{1,80}[a-z]{2}[0-9]{2}$/).optional(),
  password: z.string().min(8).max(200),
})

const parishCreate = z.object({
  name,
  location: z.string().trim().max(150).optional().nullable(),
  priest: z.string().trim().max(150).optional().nullable(),
  administrator: z.object({
    name,
    username: z.string().regex(/^[a-z0-9]{1,80}[a-z]{2}[0-9]{2}$/).optional(),
    password: z.string().min(8).max(200),
  }),
})

const parishUpdate = parishCreate.omit({ administrator: true }).partial()
const scopedCreate = z.object({
  name,
  location: z.string().trim().max(150).optional().nullable(),
  administrator,
})
const groupCreate = z.object({
  name,
  parishId: uuid.optional(),
  centreId: uuid.optional(),
  administrator,
})
const memberCreate = z.object({
  name,
  phone: z.string().trim().max(32).optional().nullable(),
  parishId: uuid.optional(),
  centreId: uuid.optional(),
  groupId: uuid.optional(),
})
const update = z.object({
  name: name.optional(),
  location: z.string().trim().max(150).optional().nullable(),
  priest: z.string().trim().max(150).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required')

const statusUpdate = z.object({ status })

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

module.exports = {
  groupCreate,
  memberCreate,
  parse,
  parishCreate,
  parishUpdate,
  scopedCreate,
  statusUpdate,
  update,
}
