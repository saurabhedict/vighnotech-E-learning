import rateLimit from 'express-rate-limit'

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } },
}

// Generous global limiter — backs every route.
export const globalLimiter = rateLimit({ windowMs: 60_000, max: 300, ...common })

// Strict limiter for auth endpoints (brute-force protection).
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, ...common })

// License verify / file-key endpoints get hit often by the launcher; keep
// reasonable but bounded.
export const verifyLimiter = rateLimit({ windowMs: 60_000, max: 120, ...common })
