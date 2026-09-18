// Loaded here rather than in server.ts so every entrypoint that reads env —
// the API, the SQL runner, any future script — gets .env without repeating this.
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Comma-separated list of browser origins allowed to call this API.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.issues.map((i) => i.message).join(', '))
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
export const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
