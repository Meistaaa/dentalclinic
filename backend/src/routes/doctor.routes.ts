import { Router } from 'express'
import { asyncHandler } from '../lib/errors.ts'
import { writeLimiter } from '../middleware/rateLimit.ts'
import {
  deleteDoctorById,
  getDoctor,
  getDoctors,
  postDoctor,
  putDoctor,
} from '../controllers/doctor.controller.ts'
import { getAvailability } from '../controllers/availability.controller.ts'

export const doctorRouter = Router()

doctorRouter.get('/', asyncHandler(getDoctors))
doctorRouter.get('/:id/availability', asyncHandler(getAvailability))
doctorRouter.get('/:id', asyncHandler(getDoctor))
doctorRouter.post('/', writeLimiter, asyncHandler(postDoctor))
doctorRouter.put('/:id', writeLimiter, asyncHandler(putDoctor))
doctorRouter.delete('/:id', writeLimiter, asyncHandler(deleteDoctorById))
