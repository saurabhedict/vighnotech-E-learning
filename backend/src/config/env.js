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
    // HLS playback fetches many segments over the length of a video, so the
    // per-bundle token lives longer than a one-shot file URL (still expires).
    hlsTokenTtl: num(process.env.HLS_TOKEN_TTL_SECONDS, 14400), // 4h
    // Download-lane offline grace: how long a launched game keeps running offline
    // before it must re-verify online. Shorter = harder to abuse. Server-controlled.
    graceDays: num(process.env.DOWNLOAD_GRACE_DAYS, 2),
  },

  // Anti-piracy / account-security policy for the download lane.
  security: {
    // Max devices a user may register (the "home devices" cap). Deauthorize to swap.
    maxDevicesPerUser: num(process.env.MAX_DEVICES_PER_USER, 3),
    // Distinct rejected devices on one license before it's flagged for review.
    licenseFlagThreshold: num(process.env.LICENSE_FLAG_THRESHOLD, 3),
    // Require 2FA enabled to buy downloadable software (games/launcher titles).
    require2faForDownload: bool(process.env.REQUIRE_2FA_FOR_DOWNLOAD, true),
    // Redirect http→https + send long HSTS (enable when behind a TLS proxy in prod).
    forceHttps: bool(process.env.FORCE_HTTPS, false),
    // In-game device-license (LicenseGuard): how long a token is valid (MINUTES).
    // Kept short so a captured app.dat dies quickly — the launcher mints a fresh
    // one on every play, so legit launches always have a valid token. And the
    // DISGUISED filename dropped into the extracted game's _Data dir (set something
    // that blends in, e.g. app.dat — the game's guard script must read the same name).
    gameLicenseTtlMinutes: num(process.env.GAME_LICENSE_TTL_MINUTES, 120),
    licenseGuardFile: process.env.LICENSE_GUARD_FILE || 'app.dat',
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

  // AWS S3 for all uploaded media (pdf/video/3d/game). When `configured` is
  // false (no bucket/region/keys), the storage service falls back to local disk
  // (storageDir) so the app runs with zero cloud setup in dev.
  s3: {
    region: process.env.AWS_REGION || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    prefix: process.env.AWS_S3_PREFIX || '',
    // SSE-S3 ('AES256') needs no key; 'aws:kms' uses AWS_S3_KMS_KEY_ID.
    sse: process.env.AWS_S3_SSE || 'AES256',
    kmsKeyId: process.env.AWS_S3_KMS_KEY_ID || '',
    endpoint: process.env.AWS_S3_ENDPOINT || '', // S3-compatible stores (R2/MinIO)
    get configured() {
      return !!(this.bucket && this.region && this.accessKeyId && this.secretAccessKey)
    },
  },

  // AWS Elemental MediaConvert — transcodes uploaded videos into adaptive HLS
  // (multi-bitrate .m3u8 + segments) written back to S3. Reuses the S3 creds.
  // Not configured (no role ARN) → videos play as progressive MP4 (no transcode).
  mediaconvert: {
    // Usually the same region as the bucket; override if your queue differs.
    region: process.env.AWS_MEDIACONVERT_REGION || process.env.AWS_REGION || '',
    // Account-specific endpoint. Blank → auto-discovered via DescribeEndpoints.
    endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT || '',
    // IAM role MediaConvert assumes to read input + write HLS output to S3.
    roleArn: process.env.AWS_MEDIACONVERT_ROLE_ARN || '',
    queueArn: process.env.AWS_MEDIACONVERT_QUEUE_ARN || '', // optional custom queue
    get configured() {
      return !!(env.s3.configured && this.roleArn && this.region)
    },
  },

  // CloudFront CDN in front of the S3 bucket — edge-caches media near viewers so
  // streaming is fast worldwide (vs. pulling from one S3 region). Access stays
  // private via CloudFront signed URLs. Not configured → fall back to presigned
  // S3 URLs. The private key may be inline (PEM, \n-escaped) or a file path.
  cloudfront: {
    domain: process.env.CLOUDFRONT_DOMAIN || '', // e.g. d111abc.cloudfront.net
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID || '',
    privateKey: (process.env.CLOUDFRONT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    privateKeyPath: process.env.CLOUDFRONT_PRIVATE_KEY_PATH || '',
    get configured() {
      return !!(this.domain && this.keyPairId && (this.privateKey || this.privateKeyPath))
    },
  },

  // Cloudinary for profile photos. Not configured → avatars are stored inline
  // as data URLs (dev fallback) so the feature still works with zero setup.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    get configured() {
      return !!(this.cloudName && this.apiKey && this.apiSecret)
    },
  },

  // Cache: in-memory stand-in by default; set REDIS_URL to back it with Redis.
  redisUrl: process.env.REDIS_URL || '',

  app: {
    name: process.env.APP_NAME || 'Vigno Smart Class',
    url: process.env.APP_URL || 'http://localhost:5173',
  },

  // Email (Nodemailer over generic SMTP). When not configured, the mailer falls
  // back to logging to the console (dev) so OTP/verification flows still work.
  email: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Vigno Smart Class <no-reply@vigno.in>',
    get configured() {
      return !!(this.host && this.user && this.pass)
    },
  },

  // SMS + WhatsApp OTP via Twilio. Not configured → codes log to the console.
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    smsFrom: process.env.TWILIO_SMS_FROM || '', // e.g. +12025550123
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', // Twilio sandbox
    get configured() {
      return !!(this.accountSid && this.authToken)
    },
  },

  otp: {
    ttlMin: num(process.env.OTP_TTL_MINUTES, 10),
    length: num(process.env.OTP_LENGTH, 6),
    maxAttempts: num(process.env.OTP_MAX_ATTEMPTS, 5),
  },

  // Optional studio-grade video DRM (Widevine/FairPlay). Configure a provider
  // to enable; otherwise the player falls back to the standard HLS stream.
  drm: {
    provider: process.env.DRM_PROVIDER || '', // 'mux' | 'vdocipher'
    muxTokenId: process.env.MUX_TOKEN_ID || '',
    muxTokenSecret: process.env.MUX_TOKEN_SECRET || '',
    vdocipherApiSecret: process.env.VDOCIPHER_API_SECRET || '',
    get configured() {
      return !!this.provider
    },
  },

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
