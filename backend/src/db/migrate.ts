import { readdir, readFile } from 'node:fs/promises'
import { pool } from './index.ts'

const migrationDirectory = new URL('./migrations/', import.meta.url)

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)

  for (const name of (await readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort()) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])
      if (!rowCount) {
        await client.query(await readFile(new URL(name, migrationDirectory), 'utf8'))
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
        console.log(`${name} applied`)
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
} catch (error) {
  console.error('Migration failed:', (error as Error).message)
  process.exitCode = 1
} finally {
  await pool.end()
}
