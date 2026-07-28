// Operational error with an HTTP status — thrown by handlers, formatted by the
// central error middleware. `code` is a stable machine-readable string.
export class ApiError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message)
    this.status = status
    this.code = code || httpCode(status)
    this.details = details
    this.expose = status < 500 // don't leak internals on 5xx
  }
}

function httpCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      402: 'PAYMENT_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
    }[status] || 'INTERNAL_ERROR'
  )
}

export const badRequest = (m, d) => new ApiError(400, m, 'BAD_REQUEST', d)
export const unauthorized = (m = 'Authentication required') => new ApiError(401, m, 'UNAUTHORIZED')
export const paymentRequired = (m = 'You do not own this content') => new ApiError(402, m, 'PAYMENT_REQUIRED')
export const forbidden = (m = 'Not allowed') => new ApiError(403, m, 'FORBIDDEN')
export const notFound = (m = 'Not found') => new ApiError(404, m, 'NOT_FOUND')
export const conflict = (m, d) => new ApiError(409, m, 'CONFLICT', d)
