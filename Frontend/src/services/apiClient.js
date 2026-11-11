const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

let csrfToken = ''

function normalizeContributionMethod(method) {
  return {
    'M-Pesa': 'm_pesa',
    Cash: 'cash',
    'Bank Transfer': 'bank_transfer',
    Cheque: 'cheque',
    Other: 'other',
  }[method] || method
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(path, options = {}) {
  const method = options.method || 'GET'
  const isStateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)
  if (isStateChanging && !csrfToken && path !== '/auth/csrf') await getCsrfToken()
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  if (isStateChanging && csrfToken) headers['X-CSRF-Token'] = csrfToken
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers, credentials: 'include' })
  const text = await response.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!response.ok) {
    const error = body?.error || {}
    if (isStateChanging && error.code === 'CSRF_INVALID' && !options._csrfRetry) {
      csrfToken = ''
      await getCsrfToken()
      return request(path, { ...options, _csrfRetry: true })
    }
    if (response.status === 401) window.dispatchEvent(new CustomEvent('finance:session-expired'))
    throw new ApiError(error.message || 'The request failed.', response.status, error.code, error.details)
  }
  return body
}

export async function getCsrfToken() {
  const response = await request('/auth/csrf')
  csrfToken = response.data.csrfToken
  return csrfToken
}

export async function login(email, password) {
  await getCsrfToken()
  const response = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  csrfToken = response.data.csrfToken
  return response.data.user
}

export async function getCurrentUser() {
  try {
    const response = await request('/auth/me')
    return response.data.user
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' })
  csrfToken = ''
}

export async function changePassword(currentPassword, newPassword) {
  const response = await request('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) })
  csrfToken = ''
  return response.data
}

export async function listRecords(entity, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'all'))
  const response = await request(`/${entity}${params.toString() ? `?${params}` : ''}`)
  return response.data.items || []
}

export async function createRecord(entity, input) {
  const payload = ['parishes', 'centres', 'groups'].includes(entity)
    ? {
        ...input,
        administrator: input.administrator || {
          name: input.email?.split('@')[0] || input.name,
          email: input.email,
          password: input.password,
        },
      }
    : input
  const response = await request(`/${entity}`, { method: 'POST', body: JSON.stringify(payload) })
  return response.data
}

export async function updateRecord(entity, id, changes) {
  if (changes.status) {
    const response = await request(`/${entity}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: changes.status }) })
    return response.data
  }
  const response = await request(`/${entity}/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
  return response.data
}

export async function removeRecord(entity, id) {
  if (entity === 'contributions') {
    const response = await request(`/contributions/${id}/void`, { method: 'POST', body: JSON.stringify({ reason: 'Voided from the finance workspace' }) })
    return response.data
  }
  await request(`/${entity}/${id}`, { method: 'DELETE' })
  return id
}

export async function listContributions(query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'all'))
  const response = await request(`/contributions${params.toString() ? `?${params}` : ''}`)
  return (response.data.items || []).map((item) => ({ ...item, amount: Number(item.amount) }))
}

export async function createContribution(input) {
  const response = await request('/contributions', { method: 'POST', body: JSON.stringify({ ...input, method: normalizeContributionMethod(input.method) }) })
  return { ...response.data, amount: Number(response.data.amount) }
}

export async function updateContribution(id, input) {
  const response = await request(`/contributions/${id}`, { method: 'PATCH', body: JSON.stringify({ ...input, method: normalizeContributionMethod(input.method) }) })
  return { ...response.data, amount: Number(response.data.amount) }
}

export async function voidContribution(id, reason) {
  const response = await request(`/contributions/${id}/void`, { method: 'POST', body: JSON.stringify({ reason }) })
  return response.data
}

export async function getDashboard(role, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value))
  const response = await request(`/dashboard/${role}${params.toString() ? `?${params}` : ''}`)
  return response.data
}

export async function downloadContributionsCsv(query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value))
  const response = await fetch(`${API_BASE_URL}/reports/contributions.csv${params.toString() ? `?${params}` : ''}`, { credentials: 'include' })
  if (!response.ok) throw new ApiError('Unable to download the report.', response.status)
  return response.blob()
}

export async function getSummaryReport(resource, id, query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value))
  const response = await request(`/reports/${resource}/${id}/summary${params.toString() ? `?${params}` : ''}`)
  return response.data
}
