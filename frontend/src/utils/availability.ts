import type { WeeklyAvailabilityPeriod } from '../types.ts'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export function availabilitySummary(periods: WeeklyAvailabilityPeriod[]): string {
  const days = new Set(periods.map((period) => period.day_of_week)).size
  return days ? `${days} working ${days === 1 ? 'day' : 'days'}` : 'No working hours set'
}
