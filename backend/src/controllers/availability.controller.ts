import type { Request, Response } from 'express'
import { AppError } from '../lib/errors.ts'
import { parse } from '../lib/validate.ts'
import { availabilityQuerySchema, idParamSchema } from '../schemas.ts'
import { getDoctorSlots } from '../services/availability.service.ts'

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  const { date } = parse(availabilityQuerySchema, req.query)
  const data = await getDoctorSlots(id, date)
  if (!data) throw new AppError(404, `No doctor with id ${id}`)
  res.json({ success: true, data })
}
