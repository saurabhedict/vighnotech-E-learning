import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'))
}

// Central error formatter. Operational ApiErrors are exposed; everything else
// is reported as a generic 500 (details only in dev).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500
  let body

  if (err instanceof ApiError && err.expose) {
    body = { error: { code: err.code, message: err.message, details: err.details } }
  } else if (err.name === 'ValidationError') {
    // Mongoose validation
    status = 400
    body = { error: { code: 'BAD_REQUEST', message: err.message } }
  } else if (err.name === 'CastError') {
    // Bad ObjectId / type in a path param → client error, not a 500
    status = 400
    body = { error: { code: 'BAD_REQUEST', message: `Invalid ${err.path || 'id'}` } }
  } else if (err.code === 11000) {
    // Mongo duplicate key
    status = 409
    body = { error: { code: 'CONFLICT', message: 'Resource already exists', details: err.keyValue } }
  } else {
    body = {
      error: {
        code: 'INTERNAL_ERROR',
        message: status >= 500 ? 'Something went wrong' : err.message,
      },
    }
    if (status >= 500) {
      console.error('[error]', err.stack || err.message)
      if (!env.isProd) body.error.debug = err.message
    }
  }

  res.status(status).json(body)
}
