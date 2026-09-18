import type { PoolClient } from 'pg'
import { pool } from '../db/index.ts'
import { AppError } from '../lib/errors.ts'
import { isoWeekday, slotFits } from '../lib/scheduling.ts'
import type { Appointment, WeeklyAvailabilityPeriod } from '../types.ts'
import type { AppointmentInput } from '../schemas.ts'

const COLUMNS = `
  a.id, a.patient_name, a.patient_phone, a.patient_email, a.doctor_id,
  to_char(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
  to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
  a.reason, a.status, a.created_at, a.updated_at,
  d.name AS doctor_name, d.specialization AS doctor_specialization`
const FROM = 'FROM appointments a JOIN doctors d ON d.id = a.doctor_id'

function isPastDate(date: string): boolean {
  const today = new Date()
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return date < localDate
}

function rejectPastDate(date: string): void {
  if (isPastDate(date)) throw new AppError(400, 'appointment_date: cannot book a past date')
}

export interface AppointmentFilters {
  status?: string
  doctorId?: number
  date?: string
}

export async function listAppointments({ status, doctorId, date }: AppointmentFilters = {}): Promise<Appointment[]> {
  const { rows } = await pool.query<Appointment>(
    `SELECT ${COLUMNS} ${FROM}
      WHERE ($1::text IS NULL OR a.status = $1)
        AND ($2::int IS NULL OR a.doctor_id = $2)
        AND ($3::date IS NULL OR a.appointment_date = $3)
      ORDER BY a.appointment_date, a.appointment_time`,
    [status ?? null, doctorId ?? null, date ?? null],
  )
  return rows
}

export async function findAppointment(id: number): Promise<Appointment | null> {
  const { rows } = await pool.query<Appointment>(`SELECT ${COLUMNS} ${FROM} WHERE a.id = $1`, [id])
  return rows[0] ?? null
}

async function validateBooking(client: PoolClient, input: AppointmentInput, excludeId?: number) {
  // Every appointment writer locks the doctor row. This serializes checks for
  // that doctor's slots, including schedule edits, before the partial unique
  // index provides a final safeguard against duplicate active appointments.
  const { rows: doctors } = await client.query<{ is_active: boolean }>(
    'SELECT is_active FROM doctors WHERE id = $1 FOR UPDATE', [input.doctor_id],
  )
  if (!doctors[0]) throw new AppError(400, `doctor_id: no doctor exists with id ${input.doctor_id}`)
  if (input.status === 'cancelled') return
  if (!doctors[0].is_active) throw new AppError(409, 'Appointments cannot be scheduled with an inactive doctor.')

  const { rows: periods } = await client.query<WeeklyAvailabilityPeriod>(
    `SELECT day_of_week, to_char(start_time, 'HH24:MI') AS start_time,
            to_char(end_time, 'HH24:MI') AS end_time
       FROM doctor_availability WHERE doctor_id = $1 AND day_of_week = $2`,
    [input.doctor_id, isoWeekday(input.appointment_date)],
  )
  if (!slotFits(periods, input.appointment_time)) {
    throw new AppError(409, 'Doctor is not available at the selected time.')
  }

  const { rowCount } = await client.query(
    `SELECT id FROM appointments
      WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
        AND status <> 'cancelled' AND ($4::int IS NULL OR id <> $4)
      LIMIT 1`,
    [input.doctor_id, input.appointment_date, input.appointment_time, excludeId ?? null],
  )
  if (rowCount) throw new AppError(409, 'The selected appointment slot is already booked.')
}

async function readAppointment(client: PoolClient, id: number): Promise<Appointment> {
  const { rows } = await client.query<Appointment>(`SELECT ${COLUMNS} ${FROM} WHERE a.id = $1`, [id])
  return rows[0]!
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  rejectPastDate(input.appointment_date)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await validateBooking(client, input)
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO appointments
         (patient_name, patient_phone, patient_email, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [input.patient_name, input.patient_phone, input.patient_email, input.doctor_id,
        input.appointment_date, input.appointment_time, input.reason, input.status],
    )
    const appointment = await readAppointment(client, rows[0]!.id)
    await client.query('COMMIT')
    return appointment
  } catch (error) {
    await client.query('ROLLBACK')
    throw translate(error, input.doctor_id)
  } finally {
    client.release()
  }
}

export async function updateAppointment(id: number, input: AppointmentInput): Promise<Appointment | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<Pick<Appointment, 'doctor_id' | 'appointment_date' | 'appointment_time' | 'status'>>(
      `SELECT doctor_id, to_char(appointment_date, 'YYYY-MM-DD') AS appointment_date,
              to_char(appointment_time, 'HH24:MI') AS appointment_time, status
         FROM appointments WHERE id = $1 FOR UPDATE`, [id],
    )
    const original = rows[0]
    if (!original) {
      await client.query('ROLLBACK')
      return null
    }
    const rescheduling = original.doctor_id !== input.doctor_id ||
      original.appointment_date !== input.appointment_date ||
      original.appointment_time !== input.appointment_time ||
      (original.status === 'cancelled' && input.status !== 'cancelled')
    if (rescheduling) rejectPastDate(input.appointment_date)
    if (original.doctor_id !== input.doctor_id || original.appointment_date !== input.appointment_date ||
        original.appointment_time !== input.appointment_time || original.status !== input.status) {
      await validateBooking(client, input, id)
    }
    await client.query(
      `UPDATE appointments
          SET patient_name = $2, patient_phone = $3, patient_email = $4, doctor_id = $5,
              appointment_date = $6, appointment_time = $7, reason = $8, status = $9
        WHERE id = $1`,
      [id, input.patient_name, input.patient_phone, input.patient_email, input.doctor_id,
        input.appointment_date, input.appointment_time, input.reason, input.status],
    )
    const appointment = await readAppointment(client, id)
    await client.query('COMMIT')
    return appointment
  } catch (error) {
    await client.query('ROLLBACK')
    throw translate(error, input.doctor_id)
  } finally {
    client.release()
  }
}

export async function deleteAppointment(id: number): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM appointments WHERE id = $1', [id])
  return rowCount === 1
}

function translate(error: unknown, doctorId: number): unknown {
  const code = (error as { code?: string }).code
  if (code === '23503') return new AppError(400, `doctor_id: no doctor exists with id ${doctorId}`)
  if (code === '23505') return new AppError(409, 'The selected appointment slot is already booked.')
  return error
}
