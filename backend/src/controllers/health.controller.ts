import type { Request, Response } from 'express'
import { checkDatabase } from '../services/health.service.ts'

export async function getHealth(_req: Request, res: Response): Promise<void> {
  await checkDatabase()
  res.json({ status: 'ok' })
}
