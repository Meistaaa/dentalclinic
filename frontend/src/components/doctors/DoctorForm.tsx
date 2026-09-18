import { useRef, useState } from 'react'
import { Button } from '../ui/Button.tsx'
import { Modal } from '../ui/Modal.tsx'
import { CheckboxField, TextField } from '../ui/Field.tsx'
import { ApiError } from '../../services/api.ts'
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor.tsx'
import type { Doctor, DoctorInput } from '../../types.ts'

const BLANK: DoctorInput = {
  name: '',
  specialization: '',
  phone: '',
  email: '',
  weekly_availability: [1, 2, 3, 4, 5].map((day_of_week) => ({ day_of_week, start_time: '09:00', end_time: '17:00' })),
  is_active: true,
}

interface DoctorFormProps {
  open: boolean
  doctor?: Doctor | null
  onClose: () => void
  onSubmit: (input: DoctorInput) => Promise<void>
}

export function DoctorForm({ open, doctor, onClose, onSubmit }: DoctorFormProps) {
  const [values, setValues] = useState<DoctorInput>(BLANK)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [loadedFor, setLoadedFor] = useState<number | 'new' | null>(null)

  // Reset when the dialog opens for a different record, rather than in an
  // effect that would also fire while the user is mid-edit.
  const key = doctor?.id ?? 'new'
  if (open && loadedFor !== key) {
    setValues(doctor ? { ...doctor } : BLANK)
    setFieldErrors({})
    setFormError(null)
    setLoadedFor(key)
  }
  if (!open && loadedFor !== null) setLoadedFor(null)

  const set = <K extends keyof DoctorInput>(field: K, value: DoctorInput[K]) =>
    setValues((prev) => ({ ...prev, [field]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setFieldErrors({})
    setFormError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        // The API reports "field: message"; split it back out so each message
        // lands under the input that caused it.
        const next: Record<string, string> = {}
        const rest: string[] = []
        for (const message of err.errors) {
          const match = /^([a-z_]+)(?:\.\d+(?:\.[a-z_]+)?)?:\s*(.+)$/.exec(message)
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

  return (
    <Modal
      open={open}
      title={doctor ? 'Edit doctor' : 'Add doctor'}
      description={doctor ? undefined : 'They will appear in the booking list straight away.'}
      onClose={() => { if (!submitting.current) onClose() }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="doctor-form" busy={busy}>
            {doctor ? 'Save changes' : 'Add doctor'}
          </Button>
        </>
      }
    >
      <form id="doctor-form" className="form" onSubmit={submit} noValidate>
        {formError && (
          <p className="field__error" role="alert">
            {formError}
          </p>
        )}
        <div className="form__grid">
          <TextField
            label="Full name"
            value={values.name}
            error={fieldErrors.name}
            onChange={(e) => set('name', e.target.value)}
            autoComplete="off"
            wide
          />
          <TextField
            label="Specialization"
            value={values.specialization}
            error={fieldErrors.specialization}
            onChange={(e) => set('specialization', e.target.value)}
            placeholder="Orthodontics"
          />
          <TextField
            label="Phone"
            type="tel"
            value={values.phone}
            error={fieldErrors.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+1-555-0100"
          />
          <TextField
            label="Email"
            type="email"
            value={values.email}
            error={fieldErrors.email}
            onChange={(e) => set('email', e.target.value)}
            hint="Used as their unique identifier."
            wide
          />
          <div className="field field--wide">
            <WeeklyScheduleEditor
              periods={values.weekly_availability}
              onChange={(periods) => set('weekly_availability', periods)}
              error={fieldErrors.weekly_availability}
            />
          </div>
          <CheckboxField
            label="Accepting appointments"
            checked={values.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            hint="Turn off to retire a doctor while keeping their appointment history."
          />
        </div>
      </form>
    </Modal>
  )
}
