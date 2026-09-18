import { z } from 'zod'
import { APPOINTMENT_STATUSES } from './types.ts'

/** Turns a zod failure into the flat string list every error response uses. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
}

const trimmed = (field: string, max = 200) =>
  z.string().trim().min(1, `${field} is required`).max(max, `${field} must be at most ${max} characters`)

// Deliberately permissive: numbers, spaces and the usual punctuation. Anything
// stricter rejects legitimate international formats.
const phone = z
  .string()
  .trim()
  .min(7, 'must be at least 7 characters')
  .max(30, 'must be at most 30 characters')
  .regex(/^[+()\d\s.-]+$/, 'may only contain digits, spaces and + ( ) . -')

const email = z.string().trim().toLowerCase().email('must be a valid email address').max(200)

// Validated as a string before conversion, so a non-numeric id reports
// "must be a positive integer" rather than zod's "expected number, received NaN".
const numericId = z
  .string()
  .regex(/^[1-9]\d*$/, 'must be a positive integer')
  .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647, 'must be a valid ID')
  .transform(Number)

export const idParamSchema = z.object({ id: numericId })

const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be a 24-hour time, HH:MM')
const halfHour = time.refine((value) => value.endsWith(':00') || value.endsWith(':30'), 'must use a 30-minute boundary')

const availabilityPeriodSchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  start_time: halfHour,
  end_time: halfHour,
}).refine((period) => period.start_time < period.end_time, {
  message: 'start time must be before end time', path: ['end_time'],
})

const weeklyAvailabilitySchema = z.array(availabilityPeriodSchema).max(28).superRefine((periods, context) => {
  for (let index = 0; index < periods.length; index++) {
    const current = periods[index]!
    for (let earlier = 0; earlier < index; earlier++) {
      const other = periods[earlier]!
      if (current.day_of_week === other.day_of_week && current.start_time < other.end_time && other.start_time < current.end_time) {
        context.addIssue({ code: 'custom', path: [index], message: 'working periods cannot overlap' })
        break
      }
    }
  }
})

export const doctorInputSchema = z.object({
  name: trimmed('name'),
  specialization: trimmed('specialization'),
  phone,
  email,
  weekly_availability: weeklyAvailabilitySchema,
  is_active: z.boolean().default(true),
})

export const doctorQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

const date = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date, YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, 'must be a real calendar date')

export const appointmentInputSchema = z.object({
  patient_name: trimmed('patient_name'),
  patient_phone: phone,
  patient_email: email,
  doctor_id: z.number().int('must be an integer').positive('must be a positive integer').max(2_147_483_647, 'must be a valid ID'),
  appointment_date: date,
  appointment_time: halfHour,
  reason: z.string().trim().max(500).default(''),
  status: z.enum(APPOINTMENT_STATUSES).default('pending'),
})

export const availabilityQuerySchema = z.object({ date })

export const appointmentQuerySchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  doctorId: numericId.optional(),
  date: date.optional(),
})

export type DoctorInput = z.infer<typeof doctorInputSchema>
export type AppointmentInput = z.infer<typeof appointmentInputSchema>
