import { Router } from 'express'
import { asyncHandler } from '../lib/errors.ts'
import { writeLimiter } from '../middleware/rateLimit.ts'
import {
  deleteAppointmentById,
  getAppointment,
  getAppointments,
  postAppointment,
  putAppointment,
} from '../controllers/appointment.controller.ts'

export const appointmentRouter = Router()

appointmentRouter.get('/', asyncHandler(getAppointments))
appointmentRouter.get('/:id', asyncHandler(getAppointment))
appointmentRouter.post('/', writeLimiter, asyncHandler(postAppointment))
appointmentRouter.put('/:id', writeLimiter, asyncHandler(putAppointment))
appointmentRouter.delete('/:id', writeLimiter, asyncHandler(deleteAppointmentById))
