import express from 'express'
import { env } from './lib/env.ts'
import { apiRouter } from './routes/index.ts'
import { globalLimiter } from './middleware/rateLimit.ts'
import { corsPolicy, securityHeaders } from './middleware/security.ts'
import { errorHandler, notFound } from './middleware/errorHandler.ts'

export const API_VERSION = 'v1'

const app = express()

// Render terminates TLS at its proxy, so req.ip is only correct with this set.
// Without it every request looks like it comes from one IP and rate limiting
// would throttle all users together.
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(securityHeaders)
app.use(corsPolicy)
// Cap the body: an unbounded JSON parse is a free memory-exhaustion vector.
app.use(express.json({ limit: '100kb' }))
app.use(globalLimiter)

// /api/v1 is the canonical prefix; /api is an unversioned alias so existing
// callers and the documented endpoints keep working. Both serve the same router,
// so a v2 is a second mount here and nothing else in the codebase changes.
app.use(`/api/${API_VERSION}`, apiRouter)
app.use('/api', apiRouter)

app.use(notFound)
app.use(errorHandler)

app.listen(env.PORT, () => console.log(`API listening on ${env.PORT} (/api and /api/${API_VERSION})`))
