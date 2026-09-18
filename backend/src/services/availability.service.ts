import { pool } from '../db/index.ts'
import { isoWeekday, slotsForPeriods, APPOINTMENT_DURATION_MINUTES } from '../lib/scheduling.ts'
import type { WeeklyAvailabilityPeriod } from '../types.ts'

export async function getDoctorSlots(doctorId: number, date: string) {
  const { rows: doctors } = await pool.query<{ is_active: boolean }>(
    'SELECT is_active FROM doctors WHERE id = $1', [doctorId],
  )
  if (!doctors[0]) return null

  const { rows: periods } = await pool.query<WeeklyAvailabilityPeriod>(
    `SELECT day_of_week, to_char(start_time, 'HH24:MI') AS start_time,
            to_char(end_time, 'HH24:MI') AS end_time
       FROM doctor_availability
      WHERE doctor_id = $1 AND day_of_week = $2
      ORDER BY start_time`,
    [doctorId, isoWeekday(date)],
  )
  const { rows: appointments } = await pool.query<{ appointment_time: string }>(
    `SELECT to_char(appointment_time, 'HH24:MI') AS appointment_time
       FROM appointments
      WHERE doctor_id = $1 AND appointment_date = $2 AND status <> 'cancelled'`,
    [doctorId, date],
  )
  const occupied = new Set(appointments.map((appointment) => appointment.appointment_time))
  return {
    doctorId,
    date,
    slotDurationMinutes: APPOINTMENT_DURATION_MINUTES,
    slots: slotsForPeriods(periods, occupied, doctors[0].is_active),
  }
}
