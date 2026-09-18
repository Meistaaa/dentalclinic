import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/Layout.tsx'
import { Card, CardHead } from '../components/ui/Card.tsx'
import { StatusBadge } from '../components/ui/Badge.tsx'
import { EmptyState, ErrorState, Loading } from '../components/ui/States.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import * as appointmentsApi from '../services/appointmentsService.ts'
import * as doctorsApi from '../services/doctorsService.ts'
import { formatDateRelative, formatTime, todayIso } from '../utils/format.ts'
import type { Appointment } from '../types.ts'

/** Every figure below is derived from the API response — nothing is hard-coded. */
function summarise(appointments: Appointment[]) {
  const today = todayIso()
  const upcoming = appointments.filter((a) => a.appointment_date >= today && a.status !== 'cancelled')
  return {
    today: appointments.filter((a) => a.appointment_date === today && a.status !== 'cancelled'),
    upcoming,
    pending: appointments.filter((a) => a.status === 'pending').length,
    next: upcoming.slice(0, 6),
  }
}

export function Dashboard() {
  const loadAppointments = useCallback(() => appointmentsApi.listAppointments(), [])
  const { data: appointments, loading, error, reload } = useAsync(loadAppointments, [])

  const loadDoctors = useCallback(() => doctorsApi.listDoctors(), [])
  const { data: doctors, loading: doctorsLoading, error: doctorsError, reload: reloadDoctors } = useAsync(loadDoctors, [])

  if (loading || doctorsLoading) return <Loading rows={6} label="Loading dashboard" />
  if (error || doctorsError) return <ErrorState message={(error ?? doctorsError)!.message} onRetry={() => { reload(); reloadDoctors() }} />

  const stats = summarise(appointments ?? [])
  const activeDoctors = (doctors ?? []).filter((d) => d.is_active).length

  return (
    <>
      <PageHeader eyebrow={formatDateRelative(todayIso())} title="Clinic overview" />

      <div className="metrics">
        <article className="metric metric--lead">
          <p className="metric__label">Today's appointments</p>
          <p className="metric__value">{stats.today.length}</p>
          <p className="metric__foot">
            {stats.today.length === 0
              ? 'Nothing scheduled for today'
              : `Next at ${formatTime(stats.today[0]!.appointment_time)}`}
          </p>
        </article>

        <article className="metric">
          <p className="metric__label">Upcoming</p>
          <p className="metric__value">{stats.upcoming.length}</p>
          <p className="metric__foot">Today and later</p>
        </article>

        <article className="metric metric--accent">
          <p className="metric__label">Pending</p>
          <p className="metric__value">{stats.pending}</p>
          <p className="metric__foot">Awaiting confirmation</p>
        </article>

        <article className="metric">
          <p className="metric__label">Doctors</p>
          <p className="metric__value">{doctors?.length ?? 0}</p>
          <p className="metric__foot">{activeDoctors} accepting appointments</p>
        </article>
      </div>

      <div className="dash-split">
        <Card>
          <CardHead title="Next up" count={`${stats.next.length} of ${stats.upcoming.length}`}>
            <Link className="btn btn--secondary btn--sm" to="/appointments">
              All appointments
            </Link>
          </CardHead>
          {stats.next.length > 0 ? (
            <div className="agenda">
              {stats.next.map((appointment) => (
                <div key={appointment.id} className="agenda__row">
                  <span className="agenda__time">{formatTime(appointment.appointment_time)}</span>
                  <div className="agenda__who">
                    <div className="agenda__name">{appointment.patient_name}</div>
                    <div className="agenda__meta">
                      {formatDateRelative(appointment.appointment_date)} · {appointment.doctor_name}
                      {appointment.reason && ` · ${appointment.reason}`}
                    </div>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing coming up"
              message="Once appointments are booked, the next few appear here so the front desk can see the day at a glance."
              action={
                <Link className="btn btn--primary" to="/appointments">
                  Book appointment
                </Link>
              }
            />
          )}
        </Card>

        <Card>
          <CardHead title="Doctors" count={`${doctors?.length ?? 0}`}>
            <Link className="btn btn--secondary btn--sm" to="/doctors">
              Manage
            </Link>
          </CardHead>
          {doctors && doctors.length > 0 ? (
            <div className="agenda">
              {doctors.slice(0, 6).map((doctor) => {
                const count = (appointments ?? []).filter(
                  (a) => a.doctor_id === doctor.id && a.appointment_date >= todayIso() && a.status !== 'cancelled',
                ).length
                return (
                  <div key={doctor.id} className="agenda__row">
                    <div className="agenda__who">
                      <div className="agenda__name">
                        <Link to={`/doctors/${doctor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {doctor.name}
                        </Link>
                      </div>
                      <div className="agenda__meta">{doctor.specialization}</div>
                    </div>
                    <span className="badge badge--plain">{count} upcoming</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No doctors yet" message="Add a doctor before booking anyone in." />
          )}
        </Card>
      </div>
    </>
  )
}
