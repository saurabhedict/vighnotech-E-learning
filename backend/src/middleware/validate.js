import { ZodError } from 'zod'
import { badRequest } from '../utils/ApiError.js'

/**
 * Validate req.body/query/params against a Zod schema and replace them with the
 * parsed (and coerced) values. Usage:
 *   router.post('/', validate({ body: schema }), handler)
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) req.query = schemas.query.parse(req.query)
      if (schemas.params) req.params = schemas.params.parse(req.params)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
        return next(badRequest('Validation failed', details))
      }
      next(err)
    }
  }
}
