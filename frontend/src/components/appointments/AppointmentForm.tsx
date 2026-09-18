import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button.tsx'
import { Modal } from '../ui/Modal.tsx'
import { SelectField, TextAreaField, TextField } from '../ui/Field.tsx'
import { ApiError } from '../../services/api.ts'
import { getDoctorAvailability } from '../../services/doctorsService.ts'
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentInput, type AppointmentSlot, type Doctor } from '../../types.ts'
import { STATUS_LABELS, todayIso } from '../../utils/format.ts'

const BLANK: AppointmentInput = {
  patient_name: '',
  patient_phone: '',
  patient_email: '',
  doctor_id: 0,
  appointment_date: '',
  appointment_time: '',
  reason: '',
  status: 'pending',
}

interface AppointmentFormProps {
  open: boolean
  appointment?: Appointment | null
  doctors: Doctor[]
  onClose: () => void
  onSubmit: (input: AppointmentInput) => Promise<void>
}

export function AppointmentForm({ open, appointment, doctors, onClose, onSubmit }: AppointmentFormProps) {
  const [values, setValues] = useState<AppointmentInput>(BLANK)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [slots, setSlots] = useState<AppointmentSlot[] | null>(null)
  const [slotLoading, setSlotLoading] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)
  const [slotRefresh, setSlotRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [loadedFor, setLoadedFor] = useState<number | 'new' | null>(null)

  const key = appointment?.id ?? 'new'
  if (open && loadedFor !== key) {
    setValues(
      appointment
        ? {
            patient_name: appointment.patient_name,
            patient_phone: appointment.patient_phone,
            patient_email: appointment.patient_email,
            doctor_id: appointment.doctor_id,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            reason: appointment.reason,
            status: appointment.status,
          }
        : { ...BLANK, appointment_date: todayIso() },
    )
    setFieldErrors({})
    setFormError(null)
    setConflict(null)
    setLoadedFor(key)
  }
  if (!open && loadedFor !== null) setLoadedFor(null)

  const set = <K extends keyof AppointmentInput>(field: K, value: AppointmentInput[K]) => {
    setValues((prev) => ({ ...prev, [field]: value,
      ...(field === 'doctor_id' || field === 'appointment_date' ? { appointment_time: '' } : {}),
    }))
    // Changing the doctor or the slot is what resolves a clash, so clear the
    // warning as soon as one of them moves.
    if (field === 'doctor_id' || field === 'appointment_date' || field === 'appointment_time') {
      setConflict(null)
    }
  }

  useEffect(() => {
    if (!open || !values.doctor_id || !values.appointment_date) {
      setSlots(null)
      setSlotError(null)
      setSlotLoading(false)
      return
    }
    let current = true
    setSlots(null)
    setSlotError(null)
    setSlotLoading(true)
    getDoctorAvailability(values.doctor_id, values.appointment_date)
      .then((response) => { if (current) setSlots(response.data.slots) })
      .catch((error: unknown) => {
        if (current) setSlotError(error instanceof ApiError ? error.message : 'Could not load available times')
      })
      .finally(() => { if (current) setSlotLoading(false) })
    return () => { current = false }
  }, [open, values.doctor_id, values.appointment_date, slotRefresh])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setFieldErrors({})
    setFormError(null)
    setConflict(null)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        setConflict(err.errors[0] ?? 'The selected time is unavailable.')
        setSlotRefresh((value) => value + 1)
      } else if (err instanceof ApiError && err.isValidation) {
        const next: Record<string, string> = {}
        const rest: string[] = []
        for (const message of err.errors) {
          const match = /^([a-z_]+):\s*(.+)$/.exec(message)
          if (match?.[1] && match[2] && match[1] in BLANK) next[match[1]] = match[2]
          else rest.push(message)
        }
        setFieldErrors(next)
        if (rest.length) setFormError(rest.join(' '))
      } else if (err instanceof ApiError) {
        setFormError(err.errors.join(' '))
      } else {
        setFormError('Something went wrong')
      }
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const originalSelection = Boolean(appointment && values.doctor_id === appointment.doctor_id &&
    values.appointment_date === appointment.appointment_date && values.appointment_time === appointment.appointment_time)
  const selectedSlot = slots?.find((slot) => slot.start === values.appointment_time)
  const pastDate = Boolean(values.appointment_date && values.appointment_date < todayIso())
  const pastRecordEdit = originalSelection && !(appointment?.status === 'cancelled' && values.status !== 'cancelled')
  const canSubmit = (originalSelection || Boolean(selectedSlot?.available)) && (!pastDate || pastRecordEdit)

  return (
    <Modal
      open={open}
      title={appointment ? 'Edit appointment' : 'Book appointment'}
      onClose={() => { if (!submitting.current) onClose() }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="appointment-form" busy={busy} disabled={!canSubmit}>
            {appointment ? 'Save changes' : 'Book appointment'}
          </Button>
        </>
      }
    >
      <form id="appointment-form" className="form" onSubmit={submit} noValidate>
        {conflict && (
          <div
            role="alert"
            style={{
              background: 'var(--amber-bg)', color: '#7a4f09', padding: '.75rem .875rem',
              borderRadius: 'var(--r-md)', fontSize: 'var(--t-sm)',
            }}
          >
            <strong>{conflict}</strong>{' '}
            Pick a different time or doctor, or check the doctor's working hours.
          </div>
        )}
        {formError && (
          <p className="field__error" role="alert">
            {formError}
          </p>
        )}

        <div className="form__grid">
          <TextField
            label="Patient name"
            value={values.patient_name}
            error={fieldErrors.patient_name}
            onChange={(e) => set('patient_name', e.target.value)}
            wide
          />
          <TextField
            label="Phone"
            type="tel"
            value={values.patient_phone}
            error={fieldErrors.patient_phone}
            onChange={(e) => set('patient_phone', e.target.value)}
            placeholder="+1-555-0200"
          />
          <TextField
            label="Email"
            type="email"
            value={values.patient_email}
            error={fieldErrors.patient_email}
            onChange={(e) => set('patient_email', e.target.value)}
          />
          <SelectField
            label="Doctor"
            value={values.doctor_id || ''}
            error={fieldErrors.doctor_id}
            onChange={(e) => set('doctor_id', Number(e.target.value))}
            wide
          >
            <option value="" disabled>
              Select a doctor
            </option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id} disabled={!doctor.is_active}>
                {doctor.name} — {doctor.specialization}
                {doctor.is_active ? '' : ' (not accepting)'}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Date"
            type="date"
            min={todayIso()}
            value={values.appointment_date}
            error={fieldErrors.appointment_date}
            onChange={(e) => set('appointment_date', e.target.value)}
          />
          {pastDate && !pastRecordEdit && (
            <p className="field__error" role="alert">Choose today or a future date for a booking.</p>
          )}
          <div className="field field--wide">
            <span className="field__label" id="appointment-slots-label">Available time slots</span>
            {!values.doctor_id || !values.appointment_date ? (
              <p className="field__hint">Choose a doctor and date to see 30-minute slots.</p>
            ) : slotLoading ? (
              <p className="field__hint" role="status">Loading available times…</p>
            ) : slotError ? (
              <p className="field__error" role="alert">{slotError}</p>
            ) : slots?.length ? (
              <div className="slot-grid" role="group" aria-labelledby="appointment-slots-label">
                {slots.map((slot) => {
                  const ownSlot = Boolean(appointment && appointment.status !== 'cancelled' &&
                    appointment.doctor_id === values.doctor_id && appointment.appointment_date === values.appointment_date &&
                    appointment.appointment_time === slot.start)
                  return (
                    <button
                      key={slot.start} type="button" className="slot-button"
                      disabled={!slot.available && !ownSlot}
                      aria-pressed={values.appointment_time === slot.start}
                      onClick={() => set('appointment_time', slot.start)}
                    >
                      <span>{slot.start}</span>
                      <small>{ownSlot ? 'Current' : slot.available ? 'Available' : 'Booked'}</small>
                    </button>
                  )
                })}
              </div>
            ) : <p className="field__hint">This doctor has no working hours on this date.</p>}
            {originalSelection && !selectedSlot && <p className="field__hint">Current appointment: {values.appointment_time}</p>}
            {fieldErrors.appointment_time && <p className="field__error" role="alert">{fieldErrors.appointment_time}</p>}
          </div>
          <SelectField
            label="Status"
            value={values.status}
            error={fieldErrors.status}
            onChange={(e) => set('status', e.target.value as AppointmentInput['status'])}
            wide
          >
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            label="Reason"
            value={values.reason}
            error={fieldErrors.reason}
            onChange={(e) => set('reason', e.target.value)}
            placeholder="Routine checkup and cleaning"
            wide
          />
        </div>
      </form>
    </Modal>
  )
}
