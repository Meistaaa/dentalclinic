import { pool } from '../db/index.ts'

/**
 * A health check that only proved the process was up would stay green while
 * every request failed, so this touches the database.
 */
export async function checkDatabase(): Promise<boolean> {
  await pool.query('SELECT 1')
  return true
}
