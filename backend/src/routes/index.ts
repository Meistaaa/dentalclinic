import { Router } from 'express'
import { authLimiter } from '../middleware/rateLimit.ts'
import { healthRouter } from './health.routes.ts'
import { doctorRouter } from './doctor.routes.ts'
import { appointmentRouter } from './appointment.routes.ts'
import { docsRouter, getOpenapiSpec } from './docs.routes.ts'

/**
 * Every feature router mounts here, and this router is mounted once under the
 * version prefix in server.ts. A v2 is then a second router beside this one,
 * with no handler in either version needing to know its own version number.
 */
export const apiRouter = Router()

// Health is exempt from the auth/write budgets: Render polls it on a schedule.
apiRouter.use('/health', healthRouter)
apiRouter.use('/docs', docsRouter)
apiRouter.get('/openapi.json', getOpenapiSpec)

apiRouter.use('/doctors', doctorRouter)
apiRouter.use('/appointments', appointmentRouter)

// Mounted at the prefix, not on individual handlers, so every credential route
// added under /auth inherits the strict budget automatically.
apiRouter.use('/auth', authLimiter)
