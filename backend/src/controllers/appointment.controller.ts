import type { Request, Response } from 'express'
import * as appointments from '../services/appointment.service.ts'
import { AppError } from '../lib/errors.ts'
import { parse } from '../lib/validate.ts'
import { appointmentInputSchema, appointmentQuerySchema, idParamSchema } from '../schemas.ts'


export async function getAppointments(req: Request, res: Response): Promise<void> {
  res.json(await appointments.listAppointments(parse(appointmentQuerySchema, req.query)))
}

export async function getAppointment(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  const appointment = await appointments.findAppointment(id)
  if (!appointment) throw new AppError(404, `No appointment with id ${id}`)
  res.json(appointment)
}

export async function postAppointment(req: Request, res: Response): Promise<void> {
  const appointment = await appointments.createAppointment(parse(appointmentInputSchema, req.body))
  res.status(201).location(`/api/appointments/${appointment.id}`).json(appointment)
}

export async function putAppointment(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  const appointment = await appointments.updateAppointment(id, parse(appointmentInputSchema, req.body))
  if (!appointment) throw new AppError(404, `No appointment with id ${id}`)
  res.json(appointment)
}

export async function deleteAppointmentById(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  if (!(await appointments.deleteAppointment(id))) throw new AppError(404, `No appointment with id ${id}`)
  res.status(204).end()
}
