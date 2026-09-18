import { api, query } from './api.ts'
import type { Doctor, DoctorAvailabilityResponse, DoctorInput } from '../types.ts'

export interface DoctorFilters {
  search?: string
  is_active?: 'true' | 'false' | ''
}

export const listDoctors = (filters: DoctorFilters = {}) =>
  api.get<Doctor[]>(`/doctors${query({ ...filters })}`)

export const getDoctor = (id: number) => api.get<Doctor>(`/doctors/${id}`)

export const getDoctorAvailability = (id: number, date: string) =>
  api.get<DoctorAvailabilityResponse>(`/doctors/${id}/availability${query({ date })}`)

export const createDoctor = (input: DoctorInput) => api.post<Doctor>('/doctors', input)

export const updateDoctor = (id: number, input: DoctorInput) => api.put<Doctor>(`/doctors/${id}`, input)

export const deleteDoctor = (id: number) => api.delete(`/doctors/${id}`)
