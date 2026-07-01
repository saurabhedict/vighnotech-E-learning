import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import mongoSanitize from 'express-mongo-sanitize'
import path from 'path'
import { fileURLToPath } from 'url'

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
import commerceRoutes from './routes/commerce.routes.js'
import profileRoutes from './routes/profile.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import notificationRoutes from './routes/notification.routes.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)

  // Force HTTPS when enabled (behind a TLS-terminating proxy/LB): redirect any
  // plaintext request to https so tokens/keys never travel in the clear.
  if (env.security.forceHttps) {
    app.use((req, res, next) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next()
      res.redirect(308, `https://${req.headers.host}${req.originalUrl}`)
    })
  }

  // ── Static files ───────────────────────────────────────────────────────────
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const publicPath = path.join(__dirname, '../../frontend/public')
  app.use('/public', express.static(publicPath))

  // ── Performance & hardening (Doc 2 §9) ─────────────────────────────────────
  app.use(compression()) // gzip/brotli responses
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // 1-year HSTS (browsers force https) only when we're actually on TLS; off in
      // local dev so http://localhost isn't pinned to https.
      hsts: env.security.forceHttps ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
  )
  // In dev, accept any localhost / 127.0.0.1 / private-LAN origin on any port —
  // Vite's `host: true` prints a Network URL (e.g. http://192.168.x.x:5173) and
  // opening that would otherwise be CORS-blocked. Prod stays on the strict list.
  const isLocalDevOrigin = (origin) => {
    try {
      const { hostname } = new URL(origin)
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      )
    } catch {
      return false
    }
  }
  app.use(
    cors({
      origin(origin, cb) {
        // allow same-origin / curl (no origin) and configured web origins.
        // Disallowed origins get cb(null, false) → the browser blocks via missing
        // CORS headers (a normal response), not a server 500.
        const allowed = !origin || env.clientOrigins.includes(origin) || (!env.isProd && isLocalDevOrigin(origin))
        cb(null, allowed)
      },
      credentials: true,
    })
  )
  // Skip 304 "Not Modified" responses — these are mostly the CMS status-polls
  // (e.g. the 4s "is it done encrypting yet?" refetch) and just flood the console.
  if (!env.isProd) app.use(morgan('dev', { skip: (_req, res) => res.statusCode === 304 }))
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
  app.use('/api', commerceRoutes) // /wallet, /coupons/validate
  app.use('/api/settings', settingsRoutes) // public branding + footer
  app.use('/api/licenses', licenseRoutes)
  app.use('/api/payments', paymentsRoutes)
  app.use('/api/content', contentRoutes)
  app.use('/api/files', filesRoutes)
  app.use('/api/devices', devicesRoutes)
  app.use('/api/profile', profileRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/admin', adminRoutes)

  // ── Errors ─────────────────────────────────────────────────────────────────
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
