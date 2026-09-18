import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/errors.ts'

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ errors: ['Not found'] })
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ errors: err.errors })
    return
  }

  // cors and body parsers throw http-errors / plain errors with a usable status.
  const status = (err as { statusCode?: number; status?: number }).statusCode ?? (err as { status?: number }).status
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ errors: [err.message] })
    return
  }
  if (err.message === 'Origin not allowed by CORS') {
    res.status(403).json({ errors: ['Origin not allowed'] })
    return
  }
  console.error(err)
  res.status(500).json({ errors: ['Internal server error'] })
}
