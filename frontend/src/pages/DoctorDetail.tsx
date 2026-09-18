import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, CardHead } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ActiveBadge, StatusBadge } from '../components/ui/Badge.tsx'
import { EmptyState, ErrorState, Loading } from '../components/ui/States.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { DoctorForm } from '../components/doctors/DoctorForm.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { useToast } from '../hooks/useToast.tsx'
import * as doctorsApi from '../services/doctorsService.ts'
import * as appointmentsApi from '../services/appointmentsService.ts'
import { ApiError } from '../services/api.ts'
import { formatDateRelative, formatTime, initials } from '../utils/format.ts'
import { availabilitySummary, WEEKDAYS } from '../utils/availability.ts'
import type { DoctorInput } from '../types.ts'

export function DoctorDetail() {
  const { id } = useParams()
  const doctorId = Number(id)
  const navigate = useNavigate()
  const { notify } = useToast()

  const loadDoctor = useCallback(() => doctorsApi.getDoctor(doctorId), [doctorId])
  const { data: doctor, loading, error, reload } = useAsync(loadDoctor, [doctorId])

  const loadAppointments = useCallback(
    () => appointmentsApi.listAppointments({ doctorId }),
    [doctorId],
  )
  const { data: appointments, loading: appointmentsLoading, error: appointmentsError, reload: reloadAppointments } = useAsync(loadAppointments, [doctorId])

  const [formOpen, setFormOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (loading) return <Loading label="Loading doctor" />
  if (error) {
    return (
      <ErrorState
        message={error.status === 404 ? 'That doctor no longer exists.' : error.message}
        onRetry={error.status === 404 ? undefined : reload}
      />
    )
  }
  if (!doctor) return null

  async function save(input: DoctorInput) {
    await doctorsApi.updateDoctor(doctorId, input)
    notify(`${input.name} updated`)
    setFormOpen(false)
    reload()
  }

  async function confirmDelete() {
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await doctorsApi.deleteDoctor(doctorId)
      notify(`${doctor!.name} deleted`)
      navigate('/doctors')
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.errors.join(' ') : 'Could not delete this doctor')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <p className="topbar__eyebrow">
        <Link to="/doctors">← All doctors</Link>
      </p>

      <header className="detail-head">
        <span className="avatar" aria-hidden="true">{initials(doctor.name)}</span>
        <div>
          <h1 style={{ color: '#fff' }}>{doctor.name}</h1>
          <p className="detail-head__meta">
            {doctor.specialization}
            {` · ${availabilitySummary(doctor.weekly_availability)}`}
          </p>
        </div>
        <div className="detail-head__actions">
          <Button onClick={() => setFormOpen(true)}>Edit</Button>
          <Button variant="danger" onClick={() => { setDeleteError(null); setConfirmOpen(true) }}>
            Delete
          </Button>
        </div>
      </header>

      <Card pad>
        <dl className="deflist">
          <div>
            <dt>Email</dt>
            <dd><a href={`mailto:${doctor.email}`}>{doctor.email}</a></dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd><a href={`tel:${doctor.phone}`}>{doctor.phone}</a></dd>
          </div>
          <div>
            <dt>Booking status</dt>
            <dd><ActiveBadge active={doctor.is_active} /></dd>
          </div>
        </dl>
      </Card>

      <Card pad>
        <h2>Weekly availability</h2>
        {doctor.weekly_availability.length ? (
          <dl className="weekly-list">
            {WEEKDAYS.map((day, index) => {
              const periods = doctor.weekly_availability.filter((period) => period.day_of_week === index + 1)
              return <div key={day}><dt>{day}</dt><dd>{periods.length ? periods.map((period) => `${period.start_time}–${period.end_time}`).join(', ') : 'Unavailable'}</dd></div>
            })}
          </dl>
        ) : <p className="field__hint">No working hours set.</p>}
      </Card>

      <Card>
        <CardHead title="Appointments" count={appointments ? `${appointments.length}` : undefined} />
        {appointmentsLoading ? <Loading label="Loading appointments" /> : appointmentsError ? (
          <ErrorState message={appointmentsError.message} onRetry={reloadAppointments} />
        ) : appointments && appointments.length > 0 ? (
          <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">When</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <div className="cell-strong">{appointment.patient_name}</div>
                      <div className="cell-sub">{appointment.patient_phone}</div>
                    </td>
                    <td>
                      <div>{formatDateRelative(appointment.appointment_date)}</div>
                      <div className="cell-sub">{formatTime(appointment.appointment_time)}</div>
                    </td>
                    <td className="cell-sub">{appointment.reason || '—'}</td>
                    <td><StatusBadge status={appointment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-records" role="list" aria-label="Doctor appointments">
            {appointments.map((appointment) => (
              <article className="record-card" role="listitem" key={appointment.id}>
                <div className="record-card__head">
                  <div>
                    <h3>{appointment.patient_name}</h3>
                    <p className="record-card__sub">{formatDateRelative(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
                <dl className="record-card__details">
                  <div><dt>Phone</dt><dd><a href={`tel:${appointment.patient_phone}`}>{appointment.patient_phone}</a></dd></div>
                  {appointment.reason && <div><dt>Reason</dt><dd>{appointment.reason}</dd></div>}
                </dl>
              </article>
            ))}
          </div>
          </>
        ) : (
          <EmptyState
            title="No appointments"
            message="Nothing is booked with this doctor yet. They can be deleted while that stays true."
          />
        )}
      </Card>

      <DoctorForm open={formOpen} doctor={doctor} onClose={() => setFormOpen(false)} onSubmit={save} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${doctor.name}?`}
        message="This cannot be undone. If this doctor has appointments, deactivate them instead."
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
