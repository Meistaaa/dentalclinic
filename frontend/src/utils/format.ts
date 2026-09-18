import type { AppointmentStatus } from '../types.ts'

/** Parses YYYY-MM-DD as a local date. `new Date(str)` would read it as UTC and
 *  shift the day backwards for anyone west of Greenwich. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export const todayIso = (): string => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function formatDate(iso: string): string {
  return parseDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "Today" and "Tomorrow" read faster than a date when scanning a list. */
export function formatDateRelative(iso: string): string {
  const today = todayIso()
  if (iso === today) return 'Today'
  const diff = Math.round((parseDate(iso).getTime() - parseDate(today).getTime()) / 86_400_000)
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatDate(iso)
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const date = new Date(2000, 0, 1, h ?? 0, m ?? 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export const isUpcoming = (iso: string): boolean => iso >= todayIso()

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
