export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export interface WeeklyAvailabilityPeriod {
  day_of_week: number
  start_time: string
  end_time: string
}

export interface AppointmentSlot {
  start: string
  end: string
  available: boolean
}

export interface DoctorAvailabilityResponse {
  success: true
  data: {
    doctorId: number
    date: string
    slotDurationMinutes: number
    slots: AppointmentSlot[]
  }
}

export interface Doctor {
  id: number
  name: string
  specialization: string
  phone: string
  email: string
  weekly_availability: WeeklyAvailabilityPeriod[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: number
  patient_name: string
  patient_phone: string
  patient_email: string
  doctor_id: number
  appointment_date: string
  appointment_time: string
  reason: string
  status: AppointmentStatus
  created_at: string
  updated_at: string
  doctor_name: string
  doctor_specialization: string
}

export type DoctorInput = Omit<Doctor, 'id' | 'created_at' | 'updated_at'>
export type AppointmentInput = Omit<
  Appointment,
  'id' | 'created_at' | 'updated_at' | 'doctor_name' | 'doctor_specialization'
>
