import type { WeeklyAvailabilityPeriod } from '../types.ts'

export const APPOINTMENT_DURATION_MINUTES = 30

export function minutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number)
  return hours! * 60 + mins!
}

export function clock(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export function isoWeekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7
}

export function slotFits(periods: WeeklyAvailabilityPeriod[], start: string): boolean {
  const firstMinute = minutes(start)
  return periods.some((period) =>
    firstMinute >= minutes(period.start_time) &&
    firstMinute + APPOINTMENT_DURATION_MINUTES <= minutes(period.end_time),
  )
}

export function slotsForPeriods(periods: WeeklyAvailabilityPeriod[], occupied: Set<string>, active: boolean) {
  const slots: { start: string; end: string; available: boolean }[] = []
  for (const period of periods) {
    for (let start = minutes(period.start_time); start + APPOINTMENT_DURATION_MINUTES <= minutes(period.end_time); start += APPOINTMENT_DURATION_MINUTES) {
      const time = clock(start)
      slots.push({ start: time, end: clock(start + APPOINTMENT_DURATION_MINUTES), available: active && !occupied.has(time) })
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start))
}
