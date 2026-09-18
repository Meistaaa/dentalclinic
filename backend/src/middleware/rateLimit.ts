import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import type { Options } from 'express-rate-limit'
import type { Request } from 'express'

const MINUTE = 60_000

// ponytail: in-memory store, so counters are per-process and reset on deploy.
// Swap in rate-limit-redis once the API runs on more than one instance.

const base: Partial<Options> = {
  standardHeaders: 'draft-8', // RateLimit / RateLimit-Policy headers
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      errors: ['Too many requests. Please slow down and try again later.'],
      retry_after_seconds: Math.ceil(options.windowMs / 1000),
    })
  },
}

/** Broad backstop on every route: generous enough that normal browsing never trips it. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 300,
})

/**
 * Credential endpoints (login / register / password reset). Tight, and keyed on
 * IP + submitted email so one attacker cannot lock out every user from a shared
 * NAT, and one email cannot be sprayed from a botnet.
 * Successful requests are not counted, so a legitimate user is never punished.
 */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`
  },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      errors: ['Too many authentication attempts. Try again in 15 minutes.'],
      retry_after_seconds: Math.ceil(options.windowMs / 1000),
    })
  },
})

/** Public writes (booking, cancelling): stricter than global, looser than auth. */
export const writeLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 20,
})
