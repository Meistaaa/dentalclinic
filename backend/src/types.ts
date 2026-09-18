export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export interface WeeklyAvailabilityPeriod {
  day_of_week: number
  start_time: string
  end_time: string
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
  /** ISO date, YYYY-MM-DD. */
  appointment_date: string
  /** 24-hour HH:MM. */
  appointment_time: string
  reason: string
  status: AppointmentStatus
  created_at: string
  updated_at: string
  /** Joined from doctors so a list view needs one query, not one per row. */
  doctor_name: string
  doctor_specialization: string
}
