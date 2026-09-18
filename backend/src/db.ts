import pg from 'pg'
import { env } from './lib/env.ts'

// Render's managed Postgres requires SSL; local dev does not.
const ssl = env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl })

/**
 * Applied on boot so a fresh database is usable without a migration CLI.
 * Feature tables are appended here as their modules land; every statement must
 * stay idempotent, because this runs on every deploy and every restart.
 */
const SCHEMA = ``

export async function migrate(): Promise<void> {
  if (!SCHEMA.trim()) return
  await pool.query(SCHEMA)
}
