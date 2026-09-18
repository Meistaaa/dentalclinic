import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** An error with an HTTP status the error handler can trust and expose. */
export class AppError extends Error {
  readonly status: number
  readonly errors: string[]

  constructor(status: number, errors: string | string[]) {
    const list = Array.isArray(errors) ? errors : [errors]
    super(list.join(', '))
    this.status = status
    this.errors = list
  }
}

/** Forwards rejected promises to Express's error handler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
