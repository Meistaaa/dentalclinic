import type { PoolClient } from 'pg'
import { pool } from '../db/index.ts'
import { AppError } from '../lib/errors.ts'
import type { Doctor } from '../types.ts'
import type { DoctorInput } from '../schemas.ts'

const COLUMNS = `
  d.id, d.name, d.specialization, d.phone, d.email, d.is_active, d.created_at, d.updated_at,
  COALESCE((
    SELECT json_agg(json_build_object(
      'day_of_week', a.day_of_week,
      'start_time', to_char(a.start_time, 'HH24:MI'),
      'end_time', to_char(a.end_time, 'HH24:MI')
    ) ORDER BY a.day_of_week, a.start_time)
    FROM doctor_availability a WHERE a.doctor_id = d.id
  ), '[]'::json) AS weekly_availability`

interface ListFilters {
  search?: string
  is_active?: boolean
}

export async function listDoctors({ search, is_active }: ListFilters = {}): Promise<Doctor[]> {
  const { rows } = await pool.query<Doctor>(
    `SELECT ${COLUMNS} FROM doctors d
      WHERE ($1::text IS NULL OR d.name ILIKE '%' || $1 || '%' OR d.specialization ILIKE '%' || $1 || '%')
        AND ($2::boolean IS NULL OR d.is_active = $2)
      ORDER BY d.name`,
    [search ?? null, is_active ?? null],
  )
  return rows
}

export async function findDoctor(id: number): Promise<Doctor | null> {
  const { rows } = await pool.query<Doctor>(`SELECT ${COLUMNS} FROM doctors d WHERE d.id = $1`, [id])
  return rows[0] ?? null
}

async function readDoctor(client: PoolClient, id: number): Promise<Doctor> {
  const { rows } = await client.query<Doctor>(`SELECT ${COLUMNS} FROM doctors d WHERE d.id = $1`, [id])
  return rows[0]!
}

async function replaceSchedule(client: PoolClient, id: number, periods: DoctorInput['weekly_availability']) {
  await client.query('DELETE FROM doctor_availability WHERE doctor_id = $1', [id])
  for (const period of periods) {
    await client.query(
      'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
      [id, period.day_of_week, period.start_time, period.end_time],
    )
  }
}

export async function createDoctor(input: DoctorInput): Promise<Doctor> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ id: number }>(
      'INSERT INTO doctors (name, specialization, phone, email, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [input.name, input.specialization, input.phone, input.email, input.is_active],
    )
    const id = rows[0]!.id
    await replaceSchedule(client, id, input.weekly_availability)
    const doctor = await readDoctor(client, id)
    await client.query('COMMIT')
    return doctor
  } catch (error) {
    await client.query('ROLLBACK')
    throw translate(error)
  } finally {
    client.release()
  }
}

export async function updateDoctor(id: number, input: DoctorInput): Promise<Doctor | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Serializes schedule edits with appointment writes for this doctor.
    const { rowCount } = await client.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [id])
    if (!rowCount) {
      await client.query('ROLLBACK')
      return null
    }
    await client.query(
      'UPDATE doctors SET name = $2, specialization = $3, phone = $4, email = $5, is_active = $6 WHERE id = $1',
      [id, input.name, input.specialization, input.phone, input.email, input.is_active],
    )
    await replaceSchedule(client, id, input.weekly_availability)
    const doctor = await readDoctor(client, id)
    await client.query('COMMIT')
    return doctor
  } catch (error) {
    await client.query('ROLLBACK')
    throw translate(error)
  } finally {
    client.release()
  }
}

export async function deleteDoctor(id: number): Promise<boolean> {
  try {
    const { rowCount } = await pool.query('DELETE FROM doctors WHERE id = $1', [id])
    return rowCount === 1
  } catch (error) {
    if ((error as { code?: string }).code === '23503') {
      const { rows } = await pool.query<{ count: string }>('SELECT count(*) FROM appointments WHERE doctor_id = $1', [id])
      throw new AppError(
        409,
        `Doctor has ${rows[0]?.count ?? 'existing'} appointment(s) and cannot be deleted. ` +
          'Set is_active to false to retire the doctor while keeping their history.',
      )
    }
    throw error
  }
}

function translate(error: unknown): unknown {
  if ((error as { code?: string }).code === '23505') return new AppError(409, 'A doctor with that email already exists')
  return error
}
