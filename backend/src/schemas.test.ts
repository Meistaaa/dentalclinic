import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appointmentInputSchema, doctorInputSchema, idParamSchema } from './schemas.ts'

const appointment = {
  patient_name: 'Alex Patient',
  patient_phone: '+1-555-0123',
  patient_email: 'alex@example.com',
  doctor_id: 1,
  appointment_date: '2026-09-18',
  appointment_time: '09:30',
  reason: '',
  status: 'pending',
}

test('appointment dates must be real calendar days', () => {
  assert.equal(appointmentInputSchema.safeParse({ ...appointment, appointment_date: '2026-02-31' }).success, false)
  assert.equal(appointmentInputSchema.safeParse({ ...appointment, appointment_date: '2024-02-29' }).success, true)
  assert.equal(appointmentInputSchema.safeParse({ ...appointment, appointment_date: '2025-02-29' }).success, false)
})

test('IDs must be positive safe integers', () => {
  assert.equal(idParamSchema.safeParse({ id: '0' }).success, false)
  assert.equal(idParamSchema.safeParse({ id: 'abc' }).success, false)
  assert.equal(idParamSchema.safeParse({ id: '999999999999999999999' }).success, false)
  assert.equal(idParamSchema.safeParse({ id: '42' }).success, true)
})

test('appointment and doctor input reject malformed values', () => {
  assert.equal(appointmentInputSchema.safeParse({ ...appointment, patient_name: '', patient_email: 'bad', status: 'unknown' }).success, false)
  assert.equal(appointmentInputSchema.safeParse({ ...appointment, doctor_id: 0 }).success, false)
  assert.equal(doctorInputSchema.safeParse({ name: '', specialization: '', phone: 'abc', email: 'bad' }).success, false)
  assert.equal(appointmentInputSchema.safeParse({ ...appointment, appointment_time: '09:15' }).success, false)
})

test('weekly availability rejects invalid and overlapping periods', () => {
  const doctor = {
    name: 'Dr. Test', specialization: 'General', phone: '+1-555-0100',
    email: 'doctor@example.test', is_active: true,
    weekly_availability: [{ day_of_week: 1, start_time: '09:00', end_time: '12:00' }],
  }
  assert.equal(doctorInputSchema.safeParse(doctor).success, true)
  assert.equal(doctorInputSchema.safeParse({ ...doctor, weekly_availability: [
    ...doctor.weekly_availability, { day_of_week: 1, start_time: '11:30', end_time: '13:00' },
  ] }).success, false)
  assert.equal(doctorInputSchema.safeParse({ ...doctor, weekly_availability: [
    { day_of_week: 0, start_time: '09:00', end_time: '12:00' },
  ] }).success, false)
  assert.equal(doctorInputSchema.safeParse({ ...doctor, weekly_availability: [
    { day_of_week: 1, start_time: '09:15', end_time: '12:00' },
  ] }).success, false)
  assert.equal(doctorInputSchema.safeParse({ ...doctor, weekly_availability: [
    { day_of_week: 1, start_time: '12:00', end_time: '09:00' },
  ] }).success, false)
})
