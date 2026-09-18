import type { ZodType } from 'zod'
import { AppError } from './errors.ts'
import { formatIssues } from '../schemas.ts'

/**
 * Parses request input or throws the 400 the client should see, so controllers
 * read as a list of steps rather than a list of if-checks.
 */
export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new AppError(400, formatIssues(result.error))
  return result.data
}
