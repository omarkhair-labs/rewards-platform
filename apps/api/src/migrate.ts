import crypto from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const lockKey = 'rewards-platform:schema-migrations';

function migrationBody(sql: string) {
  return sql
    .replace(/^\s*BEGIN\s*;?/i, '')
    .replace(/COMMIT\s*;?\s*$/i, '');
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const dir = fileURLToPath(new URL('../migrations/', import.meta.url));
    const files = (await readdir(dir)).filter(name => name.endsWith('.sql')).sort();

    for (const filename of files) {
      const sql = await readFile(path.join(dir, filename), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const prior = await client.query(
        'SELECT checksum FROM schema_migrations WHERE filename=$1',
        [filename]
      );

      if (prior.rows[0]) {
        if (prior.rows[0].checksum !== checksum) {
          throw new Error(`Migration checksum changed after apply: ${filename}`);
        }
        console.log(`skip ${filename}`);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migrationBody(sql));
        await client.query(
          'INSERT INTO schema_migrations(filename,checksum) VALUES ($1,$2)',
          [filename, checksum]
        );
        await client.query('COMMIT');
        console.log(`applied ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]); } catch {}
    client.release();
  }
}

run()
  .then(async () => {
    await pool.end();
    console.log('database migrations complete');
  })
  .catch(async error => {
    console.error(error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
