import { Router } from 'express'
import type { RequestHandler } from 'express'
import { serve, setup } from 'swagger-ui-express'
import { openapiSpec } from '../docs/openapi.ts'

export const docsRouter = Router()

// The API's own CSP is default-src 'none', which is right for JSON but would stop
// Swagger UI loading its stylesheet and bundle. This relaxes the policy for the
// docs page alone, to same-origin assets plus the inline style/script it injects.
const docsCsp: RequestHandler = (_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
  )
  next()
}

docsRouter.use(docsCsp, serve, setup(openapiSpec, { customSiteTitle: 'Dental Clinic API' }))

/** The raw document, for client generators and for importing into Postman. */
export const getOpenapiSpec: RequestHandler = (_req, res) => {
  res.json(openapiSpec)
}
