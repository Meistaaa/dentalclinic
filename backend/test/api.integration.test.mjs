import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const base = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1'
const unique = randomUUID()
const headers = {
  'Content-Type': 'application/json',
  'X-Forwarded-For': `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
}

async function request(method, path, input) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: input === undefined ? undefined : JSON.stringify(input),
  })
  const body = response.status === 204 ? null : await response.json()
  return { status: response.status, body }
}

test('API validates edge cases and supports CRUD without leaking test records', async () => {
  let doctorId
  let appointmentId
  const doctor = {
    name: 'Dr. Integration Test', specialization: 'Testing', phone: '+1-555-0111',
    email: `doctor-${unique}@example.test`,
    weekly_availability: [{ day_of_week: 4, start_time: '09:00', end_time: '12:00' }],
    is_active: true,
  }
  const appointment = {
    patient_name: 'Integration Test', patient_phone: '+1-555-0222',
    patient_email: `patient-${unique}@example.test`, doctor_id: 0,
    appointment_date: '2099-12-31', appointment_time: '11:30',
    reason: 'Integration test', status: 'pending',
  }

  try {
    assert.equal((await request('POST', '/doctors', {})).status, 400)
    assert.equal((await request('POST', '/doctors', { ...doctor, email: 'bad', phone: 'abc' })).status, 400)
    const createdDoctor = await request('POST', '/doctors', doctor)
    assert.equal(createdDoctor.status, 201)
    doctorId = createdDoctor.body.id
    appointment.doctor_id = doctorId

    assert.equal((await request('POST', '/doctors', doctor)).status, 409)
    assert.equal((await request('GET', '/doctors/abc')).status, 400)
    assert.equal((await request('GET', '/doctors/999999999999999999999')).status, 400)
    assert.equal((await request('GET', '/doctors/2147483647')).status, 404)
    assert.equal((await request('POST', '/appointments', { ...appointment, status: 'unknown' })).status, 400)
    assert.equal((await request('POST', '/appointments', { ...appointment, appointment_date: '2026-02-31' })).status, 400)
    assert.equal((await request('POST', '/appointments', { ...appointment, doctor_id: 2147483647 })).status, 400)
    assert.deepEqual((await request('GET', `/appointments?doctorId=${doctorId}`)).body, [])

    const created = await request('POST', '/appointments', appointment)
    assert.equal(created.status, 201)
    appointmentId = created.body.id
    assert.equal((await request('POST', '/appointments', { ...appointment, patient_name: 'Second Patient' })).status, 409)
    assert.equal((await request('DELETE', `/doctors/${doctorId}`)).status, 409)

    const updated = await request('PUT', `/appointments/${appointmentId}`, {
      ...appointment, patient_name: 'Updated Patient', status: 'confirmed',
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.patient_name, 'Updated Patient')
    assert.equal(updated.body.status, 'confirmed')
    assert.equal((await request('GET', '/appointments/0')).status, 400)
    assert.equal((await request('GET', '/appointments/2147483647')).status, 404)

    assert.equal((await request('DELETE', `/appointments/${appointmentId}`)).status, 204)
    appointmentId = undefined
    assert.equal((await request('DELETE', `/doctors/${doctorId}`)).status, 204)
    doctorId = undefined
  } finally {
    if (appointmentId) await request('DELETE', `/appointments/${appointmentId}`)
    if (doctorId) await request('DELETE', `/doctors/${doctorId}`)
  }
})
