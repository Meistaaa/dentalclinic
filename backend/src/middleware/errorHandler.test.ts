import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.ts'

test('unexpected errors return a generic body without stack traces', () => {
  const status = { code: 0 }
  let body: unknown
  const response = {
    status(code: number) { status.code = code; return this },
    json(value: unknown) { body = value; return this },
  } as unknown as Response
  const previousError = console.error
  console.error = () => {}
  try {
    errorHandler(new Error('secret database failure'), {} as Request, response, () => {})
  } finally {
    console.error = previousError
  }
  assert.equal(status.code, 500)
  assert.deepEqual(body, { errors: ['Internal server error'] })
  assert.doesNotMatch(JSON.stringify(body), /secret|stack/i)
})
