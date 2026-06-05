import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ms from '../utils/ms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load server/.env regardless of where the process is started from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const bool = (v, def = false) =>
  v === undefined ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())

const num = (v, def) => (v === undefined || v === '' ? def : Number(v))

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI || '',
  useMemoryDb: bool(process.env.USE_MEMORY_DB, !process.env.MONGO_URI),

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
    cookieSecure: bool(process.env.COOKIE_SECURE, false),
  },

  license: {
    keyDir: process.env.LICENSE_KEY_DIR || './keys',
    activeKid: process.env.LICENSE_ACTIVE_KID || 'vigno-key-2026',
    ttl: process.env.LICENSE_TTL || '7d',
    // Distinct secrets for two trust domains: signing stream URLs vs deriving
    // content decryption keys. Reusing one secret widens blast radius.
    signedUrlSecret: process.env.SIGNED_URL_SECRET || 'dev-signed-url-secret',
    contentKeySecret: process.env.CONTENT_KEY_SECRET || 'dev-content-key-secret',
    signedUrlTtl: num(process.env.SIGNED_URL_TTL_SECONDS, 60),
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    // When no keys are configured we run a safe in-process mock gateway.
    get mock() {
      return !this.keyId || !this.keySecret
    },
  },

  storageDir: process.env.STORAGE_DIR || './storage',

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@vigno.in',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
}

// Fail fast on misconfigured durations (a typo like LICENSE_TTL='1w' must not
// silently mint immediately-expired licenses).
for (const [name, value] of [
  ['LICENSE_TTL', env.license.ttl],
  ['ACCESS_TOKEN_TTL', env.jwt.accessTtl],
  ['REFRESH_TOKEN_TTL', env.jwt.refreshTtl],
]) {
  let valid = false
  try {
    valid = ms(value) > 0
  } catch {
    valid = false
  }
  if (!valid) {
    // eslint-disable-next-line no-console
    console.error(`[env] FATAL: invalid duration for ${name}: "${value}" (use e.g. 15m, 7d)`)
    process.exit(1)
  }
}

// Refuse to boot production with default secrets or the mock payment gateway.
if (env.isProd) {
  const isWeak = (s) => !s || s.startsWith('dev-') || s.startsWith('change-me')
  const weak = []
  if (isWeak(env.jwt.accessSecret)) weak.push('JWT_ACCESS_SECRET')
  if (isWeak(env.jwt.refreshSecret)) weak.push('JWT_REFRESH_SECRET')
  if (isWeak(env.license.signedUrlSecret)) weak.push('SIGNED_URL_SECRET')
  if (isWeak(env.license.contentKeySecret)) weak.push('CONTENT_KEY_SECRET')
  if (env.razorpay.mock) weak.push('RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET (mock gateway is forbidden in production)')
  if (!env.razorpay.webhookSecret) weak.push('RAZORPAY_WEBHOOK_SECRET')
  if (weak.length) {
    // eslint-disable-next-line no-console
    console.error(`[env] FATAL: insecure configuration in production:\n  - ${weak.join('\n  - ')}`)
    process.exit(1)
  }
}
