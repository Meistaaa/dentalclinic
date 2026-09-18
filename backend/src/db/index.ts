import pg from 'pg'
import { env } from '../lib/env.ts'

// Render's managed Postgres requires SSL; local dev does not.
const ssl = env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl })
