import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import mongoSanitize from 'express-mongo-sanitize'

import { env } from './config/env.js'
import { globalLimiter } from './middleware/rateLimit.js'
import { notFoundHandler, errorHandler } from './middleware/error.js'

import { webhook } from './controllers/payments.controller.js'
import wellknownRoutes from './routes/wellknown.routes.js'
import authRoutes from './routes/auth.routes.js'
import coursesRoutes from './routes/courses.routes.js'
import adminRoutes from './routes/admin.routes.js'
import licenseRoutes from './routes/license.routes.js'
import paymentsRoutes from './routes/payments.routes.js'
import contentRoutes from './routes/content.routes.js'
import filesRoutes from './routes/files.routes.js'
import devicesRoutes from './routes/devices.routes.js'
import discoverRoutes from './routes/discover.routes.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)

  // ── Security & hardening (Doc 2 §9) ────────────────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin(origin, cb) {
        // allow same-origin / curl (no origin) and configured web origins.
        // Disallowed origins get cb(null, false) → the browser blocks via missing
        // CORS headers (a normal response), not a server 500.
        cb(null, !origin || env.clientOrigins.includes(origin))
      },
      credentials: true,
    })
  )
  if (!env.isProd) app.use(morgan('dev'))
  app.use(globalLimiter)

  // Razorpay webhook needs the RAW body for signature verification — mount it
  // BEFORE the JSON parser.
  app.post('/api/payments/webhook', express.raw({ type: '*/*' }), webhook)

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(mongoSanitize())

  // ── Health & public key ────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'vigno-smart-class-api', env: env.nodeEnv }))
  app.use('/', wellknownRoutes)

  // ── API ────────────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes)
  app.use('/api', coursesRoutes) // /courses, /contents/:id
  app.use('/api', discoverRoutes) // /search, /favorites, /progress, /recommended
  app.use('/api/licenses', licenseRoutes)
  app.use('/api/payments', paymentsRoutes)
  app.use('/api/content', contentRoutes)
  app.use('/api/files', filesRoutes)
  app.use('/api/devices', devicesRoutes)
  app.use('/api/admin', adminRoutes)

  // ── Errors ─────────────────────────────────────────────────────────────────
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
