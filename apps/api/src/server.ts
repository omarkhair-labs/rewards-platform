import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db.js';

const server = app.listen(env.PORT, () => {
  console.log(`Rewards API listening on :${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal}: shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
