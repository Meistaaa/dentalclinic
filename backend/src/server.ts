import 'dotenv/config'
import express from 'express'
import { env } from './lib/env.ts'
import { migrate } from './db.ts'
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

// The only place the version appears. Adding v2 means one more mount line.
app.use(`/api/${API_VERSION}`, apiRouter)

app.use(notFound)
app.use(errorHandler)

await migrate()
app.listen(env.PORT, () => console.log(`API listening on ${env.PORT} at /api/${API_VERSION}`))
