import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/Layout.tsx'
import { Card, CardHead } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { SelectField, TextField } from '../components/ui/Field.tsx'
import { StatusBadge } from '../components/ui/Badge.tsx'
import { EmptyState, ErrorState, Loading } from '../components/ui/States.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { AppointmentForm } from '../components/appointments/AppointmentForm.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { useToast } from '../hooks/useToast.tsx'
import * as appointmentsApi from '../services/appointmentsService.ts'
import * as doctorsApi from '../services/doctorsService.ts'
import { ApiError } from '../services/api.ts'
import { formatDateRelative, formatTime, STATUS_LABELS } from '../utils/format.ts'
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentInput, type AppointmentStatus } from '../types.ts'

export function Appointments() {
  const { notify } = useToast()
  const [status, setStatus] = useState<AppointmentStatus | ''>('')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [date, setDate] = useState('')

  const load = useCallback(
    () => appointmentsApi.listAppointments({ status, doctorId, date }),
    [status, doctorId, date],
  )
  const { data, loading, error, reload } = useAsync(load, [status, doctorId, date])

  // The doctor list feeds both the filter and the booking form's selector.
  const loadDoctors = useCallback(() => doctorsApi.listDoctors(), [])
  const { data: doctors, loading: doctorsLoading, error: doctorsError, reload: reloadDoctors } = useAsync(loadDoctors, [])

  const [editing, setEditing] = useState<Appointment | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Appointment | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function save(input: AppointmentInput) {
    if (editing) {
      await appointmentsApi.updateAppointment(editing.id, input)
      notify('Appointment updated')
    } else {
      await appointmentsApi.createAppointment(input)
      notify(`Booked for ${input.patient_name}`)
    }
    setFormOpen(false)
    setEditing(null)
    reload()
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await appointmentsApi.deleteAppointment(deleting.id)
      notify('Appointment deleted')
      setDeleting(null)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.errors.join(' ') : 'Could not delete this appointment')
    } finally {
      setDeleteBusy(false)
    }
  }

  const filtered = Boolean(status || doctorId || date)
  const clearFilters = () => {
    setStatus('')
    setDoctorId('')
    setDate('')
  }

  return (
    <>
      <PageHeader eyebrow="Clinic" title="Appointments">
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          disabled={!doctors?.length}
        >
          Book appointment
        </Button>
      </PageHeader>

      {doctorsError && <ErrorState message={`Could not load doctors. ${doctorsError.message}`} onRetry={reloadDoctors} />}

      <Card>
        <CardHead title="Schedule" count={data ? `${data.length}` : undefined}>
          <div className="filters">
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
            >
              <option value="">All statuses</option>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Doctor"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All doctors</option>
              {(doctors ?? []).map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {filtered && (
              <Button variant="ghost" onClick={clearFilters} style={{ marginBottom: '.125rem' }}>
                Clear
              </Button>
            )}
          </div>
        </CardHead>

        {loading && <Loading label="Loading appointments" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && data.length > 0 && (
          <>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Appointments with patient, doctor, date, reason, and status</caption>
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Doctor</th>
                  <th scope="col">When</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <div className="cell-strong">{appointment.patient_name}</div>
                      <div className="cell-sub">{appointment.patient_phone}</div>
                    </td>
                    <td>
                      <div>{appointment.doctor_name}</div>
                      <div className="cell-sub">{appointment.doctor_specialization}</div>
                    </td>
                    <td>
                      <div className="cell-strong">{formatDateRelative(appointment.appointment_date)}</div>
                      <div className="cell-sub">{formatTime(appointment.appointment_time)}</div>
                    </td>
                    <td className="cell-sub">{appointment.reason || '—'}</td>
                    <td><StatusBadge status={appointment.status} /></td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(appointment)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleting(appointment)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-records" role="list" aria-label="Appointments">
            {data.map((appointment) => (
              <article className="record-card" role="listitem" key={appointment.id}>
                <div className="record-card__head">
                  <div>
                    <h3>{appointment.patient_name}</h3>
                    <p className="record-card__sub">{formatDateRelative(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
                <dl className="record-card__details">
                  <div><dt>Doctor</dt><dd>{appointment.doctor_name}</dd></div>
                  <div><dt>Phone</dt><dd><a href={`tel:${appointment.patient_phone}`}>{appointment.patient_phone}</a></dd></div>
                  {appointment.reason && <div><dt>Reason</dt><dd>{appointment.reason}</dd></div>}
                </dl>
                <div className="record-card__actions">
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(appointment); setFormOpen(true) }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteError(null); setDeleting(appointment) }}>Delete</Button>
                </div>
              </article>
            ))}
          </div>
          </>
        )}
        {data && data.length === 0 && !doctorsLoading && !doctorsError && (
          <EmptyState
            title={filtered ? 'Nothing matches those filters' : !doctors?.length ? 'Add a doctor first' : 'No appointments booked'}
            message={
              filtered
                ? 'Try a different date, doctor or status.'
                : !doctors?.length
                  ? 'Appointments need a doctor. Add one to start taking bookings.'
                : 'Book the first appointment and it will appear here and on the dashboard.'
            }
            action={
              filtered ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : !doctors?.length ? (
                <Link className="btn btn--primary" to="/doctors">Add doctor</Link>
              ) : (
                <Button variant="primary" onClick={() => setFormOpen(true)} disabled={!doctors?.length}>
                  Book appointment
                </Button>
              )
            }
          />
        )}
      </Card>

      <AppointmentForm
        open={formOpen}
        appointment={editing}
        doctors={doctors ?? []}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={save}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this appointment?"
        message={
          deleting
            ? `${deleting.patient_name} with ${deleting.doctor_name} on ${formatDateRelative(deleting.appointment_date)} at ${formatTime(deleting.appointment_time)}. This cannot be undone.`
            : ''
        }
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
