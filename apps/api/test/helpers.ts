import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from '../src/db.js';

export async function rebuildTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Refusing to rebuild database outside NODE_ENV=test');
  }

  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');

  const dir=fileURLToPath(new URL('../migrations/', import.meta.url));
  const files=(await readdir(dir)).filter(name=>name.endsWith('.sql')).sort();

  for(const file of files){
    const sql=await readFile(path.join(dir,file),'utf8');
    await pool.query(sql);
  }
}
