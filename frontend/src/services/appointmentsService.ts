import { api, query } from './api.ts'
import type { Appointment, AppointmentInput, AppointmentStatus } from '../types.ts'

export interface AppointmentFilters {
  status?: AppointmentStatus | ''
  doctorId?: number | ''
  date?: string
}

export const listAppointments = (filters: AppointmentFilters = {}) =>
  api.get<Appointment[]>(`/appointments${query({ ...filters })}`)

export const getAppointment = (id: number) => api.get<Appointment>(`/appointments/${id}`)

export const createAppointment = (input: AppointmentInput) => api.post<Appointment>('/appointments', input)

export const updateAppointment = (id: number, input: AppointmentInput) =>
  api.put<Appointment>(`/appointments/${id}`, input)

export const deleteAppointment = (id: number) => api.delete(`/appointments/${id}`)
