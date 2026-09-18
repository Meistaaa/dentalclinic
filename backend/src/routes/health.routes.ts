import { Router } from 'express'
import { asyncHandler } from '../lib/errors.ts'
import { getHealth } from '../controllers/health.controller.ts'

export const healthRouter = Router()

healthRouter.get('/', asyncHandler(getHealth))
