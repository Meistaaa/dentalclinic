import type { Request, Response } from 'express'
import { pool } from '../db.ts'

/** Render's health check hits this; it must prove the DB is reachable, not just the process. */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  await pool.query('SELECT 1')
  res.json({ status: 'ok' })
}
