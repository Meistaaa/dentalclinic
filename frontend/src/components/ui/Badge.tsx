import type { ReactNode } from 'react'
import type { AppointmentStatus } from '../../types.ts'
import { STATUS_LABELS } from '../../utils/format.ts'

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export const StatusBadge = ({ status }: { status: AppointmentStatus }) => (
  <Badge tone={status}>{STATUS_LABELS[status]}</Badge>
)

export const ActiveBadge = ({ active }: { active: boolean }) => (
  <Badge tone={active ? 'active' : 'inactive'}>{active ? 'Active' : 'Inactive'}</Badge>
)
