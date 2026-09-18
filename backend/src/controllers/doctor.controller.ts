import type { Request, Response } from 'express'
import * as doctors from '../services/doctor.service.ts'
import { AppError } from '../lib/errors.ts'
import { parse } from '../lib/validate.ts'
import { doctorInputSchema, doctorQuerySchema, idParamSchema } from '../schemas.ts'


export async function getDoctors(req: Request, res: Response): Promise<void> {
  res.json(await doctors.listDoctors(parse(doctorQuerySchema, req.query)))
}

export async function getDoctor(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  const doctor = await doctors.findDoctor(id)
  if (!doctor) throw new AppError(404, `No doctor with id ${id}`)
  res.json(doctor)
}

export async function postDoctor(req: Request, res: Response): Promise<void> {
  const doctor = await doctors.createDoctor(parse(doctorInputSchema, req.body))
  res.status(201).location(`/api/doctors/${doctor.id}`).json(doctor)
}

export async function putDoctor(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  const doctor = await doctors.updateDoctor(id, parse(doctorInputSchema, req.body))
  if (!doctor) throw new AppError(404, `No doctor with id ${id}`)
  res.json(doctor)
}

export async function deleteDoctorById(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamSchema, req.params)
  if (!(await doctors.deleteDoctor(id))) throw new AppError(404, `No doctor with id ${id}`)
  res.status(204).end()
}
