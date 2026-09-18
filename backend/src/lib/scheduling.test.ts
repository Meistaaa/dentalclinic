import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isoWeekday, slotFits, slotsForPeriods } from './scheduling.ts'

test('slots include the last period ending at closing time and exclude closing time', () => {
  const periods = [{ day_of_week: 1, start_time: '09:00', end_time: '10:00' }]
  assert.deepEqual(slotsForPeriods(periods, new Set(['09:00']), true), [
    { start: '09:00', end: '09:30', available: false },
    { start: '09:30', end: '10:00', available: true },
  ])
  assert.equal(slotFits(periods, '09:30'), true)
  assert.equal(slotFits(periods, '10:00'), false)
})

test('ISO weekdays are stable across local time zones', () => {
  assert.equal(isoWeekday('2026-09-21'), 1)
  assert.equal(isoWeekday('2026-09-20'), 7)
})
