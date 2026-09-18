import { readFile } from 'node:fs/promises'
import { pool } from './index.ts'

// Applies the base schema or idempotent sample seed. Versioned migrations run
// separately through migrate.ts and are recorded in schema_migrations.
const name = process.argv[2]
if (!name) {
  console.error('usage: node src/db/run-sql.ts <file.sql>')
  process.exit(1)
}

try {
  const sql = await readFile(new URL(name, import.meta.url), 'utf8')
  await pool.query(sql)
  console.log(`${name} applied`)
} catch (err) {
  console.error(`${name} failed:`, (err as Error).message)
  process.exitCode = 1
} finally {
  await pool.end()
}
