import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const base = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1'
const unique = randomUUID()
let requestNumber = 10

async function request(method, path, input) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `198.51.100.${requestNumber++}`,
    },
    body: input === undefined ? undefined : JSON.stringify(input),
  })
  return { status: response.status, body: response.status === 204 ? null : await response.json() }
}

test('weekly schedules govern 30-minute booking, editing, cancellation and races', async () => {
  const doctors = []
  const appointments = new Set()
  const monday = '2030-01-07'
  const patient = {
    patient_name: 'Schedule Test', patient_phone: '+1-555-0222',
    patient_email: `patient-${unique}@example.test`, appointment_date: monday,
    appointment_time: '09:00', reason: 'Checkup', status: 'pending',
  }
  async function createDoctor(suffix, is_active, start) {
    const result = await request('POST', '/doctors', {
      name: `Dr. Schedule ${suffix}`, specialization: 'Testing', phone: '+1-555-0111',
      email: `${suffix}-${unique}@example.test`, is_active,
      weekly_availability: [{ day_of_week: 1, start_time: start, end_time: '12:00' }],
    })
    assert.equal(result.status, 201, JSON.stringify(result.body))
    doctors.push(result.body.id)
    return result.body.id
  }
  try {
    const doctorA = await createDoctor('a', true, '09:00')
    const doctorB = await createDoctor('b', true, '10:00')
    const inactive = await createDoctor('inactive', false, '09:00')
    const booking = { ...patient, doctor_id: doctorA }
    const pastBooking = { ...booking, appointment_date: '2020-01-06' }
    const pastResult = await request('POST', '/appointments', pastBooking)
    assert.equal(pastResult.status, 400)
    assert.match(pastResult.body.errors.join(' '), /past date/i)

    const initial = await request('GET', `/doctors/${doctorA}/availability?date=${monday}`)
    assert.equal(initial.status, 200)
    assert.equal(initial.body.data.slotDurationMinutes, 30)
    assert.equal(initial.body.data.slots.length, 6)
    assert.deepEqual(initial.body.data.slots.at(-1), { start: '11:30', end: '12:00', available: true })
    assert.equal((await request('GET', `/doctors/${doctorA}/availability?date=2030-02-31`)).status, 400)
    assert.equal((await request('GET', `/doctors/2147483647/availability?date=${monday}`)).status, 404)

    const first = await request('POST', '/appointments', booking)
    assert.equal(first.status, 201, JSON.stringify(first.body))
    appointments.add(first.body.id)
    const pastMove = await request('PUT', `/appointments/${first.body.id}`, pastBooking)
    assert.equal(pastMove.status, 400)
    assert.match(pastMove.body.errors.join(' '), /past date/i)
    assert.equal((await request('POST', '/appointments', booking)).status, 409)
    assert.equal((await request('POST', '/appointments', { ...booking, appointment_time: '12:00' })).status, 409)
    assert.equal((await request('POST', '/appointments', { ...booking, appointment_date: '2030-01-08' })).status, 409)
    assert.equal((await request('POST', '/appointments', { ...booking, doctor_id: inactive })).status, 409)
    assert.equal((await request('POST', '/appointments', { ...booking, doctor_id: 2147483647 })).status, 400)
    const occupied = await request('GET', `/doctors/${doctorA}/availability?date=${monday}`)
    assert.equal(occupied.body.data.slots[0].available, false)

    assert.equal((await request('PUT', `/appointments/${first.body.id}`, { ...booking, reason: 'Edited reason' })).status, 200)
    assert.equal((await request('PUT', `/appointments/${first.body.id}`, { ...booking, appointment_time: '09:30' })).status, 200)
    const moved = await request('GET', `/doctors/${doctorA}/availability?date=${monday}`)
    assert.equal(moved.body.data.slots[0].available, true)
    assert.equal(moved.body.data.slots[1].available, false)

    assert.equal((await request('PUT', `/appointments/${first.body.id}`, { ...booking, doctor_id: doctorB, appointment_time: '09:30' })).status, 409)
    assert.equal((await request('PUT', `/appointments/${first.body.id}`, { ...booking, doctor_id: doctorB, appointment_time: '10:00' })).status, 200)
    const released = await request('GET', `/doctors/${doctorA}/availability?date=${monday}`)
    assert.equal(released.body.data.slots[1].available, true)

    const cancelled = await request('POST', '/appointments', { ...booking, doctor_id: doctorB, appointment_time: '10:30' })
    assert.equal(cancelled.status, 201)
    appointments.add(cancelled.body.id)
    assert.equal((await request('PUT', `/appointments/${cancelled.body.id}`, { ...booking, doctor_id: doctorB, appointment_time: '10:30', status: 'cancelled' })).status, 200)
    const afterCancel = await request('GET', `/doctors/${doctorB}/availability?date=${monday}`)
    assert.equal(afterCancel.body.data.slots.find((slot) => slot.start === '10:30').available, true)
    const reused = await request('POST', '/appointments', { ...booking, doctor_id: doctorB, appointment_time: '10:30' })
    assert.equal(reused.status, 201)
    appointments.add(reused.body.id)

    const closing = await request('POST', '/appointments', { ...booking, appointment_time: '11:30' })
    assert.equal(closing.status, 201)
    appointments.add(closing.body.id)
    assert.equal((await request('PUT', `/appointments/${closing.body.id}`, { ...booking, appointment_time: '11:30', status: 'completed' })).status, 200)
    assert.equal((await request('POST', '/appointments', { ...booking, appointment_time: '11:30' })).status, 409)

    const race = await Promise.all([
      request('POST', '/appointments', { ...booking, appointment_time: '10:00' }),
      request('POST', '/appointments', { ...booking, appointment_time: '10:00' }),
    ])
    assert.deepEqual(race.map((result) => result.status).sort(), [201, 409])
    appointments.add(race.find((result) => result.status === 201).body.id)
  } finally {
    for (const id of appointments) await request('DELETE', `/appointments/${id}`)
    for (const id of doctors) await request('DELETE', `/doctors/${id}`)
  }
})
