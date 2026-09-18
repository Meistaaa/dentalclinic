import cors from 'cors'
import helmet from 'helmet'
import type { RequestHandler } from 'express'
import { allowedOrigins, isProd } from '../lib/env.ts'

/**
 * Header hardening. This API only ever returns JSON, so the CSP is locked to
 * nothing at all — there is no legitimate script, frame or image for a response
 * of ours to load, which makes any reflected-content trick inert.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: isProd ? { maxAge: 15_552_000, includeSubDomains: true } : false,
})

/**
 * Credentialed CORS: a wildcard origin is illegal once credentials are on, so the
 * allowlist is explicit and an unknown origin is rejected rather than reflected.
 * credentials stays on for the session cookie auth will need.
 */
export const corsPolicy: RequestHandler = cors({
  origin(origin, callback) {
    // No Origin header: same-origin, curl, or a health check. Not a browser vector.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Origin not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86_400,
})
