import crypto from 'node:crypto';
import { env } from './config/env.js';
import { pool, tx } from './db.js';
import { hashPassword } from './auth.js';

async function run() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const username = env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !username || !password) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD are required');
  }

  const admin = await tx(async client => {
    const existing = await client.query(
      'SELECT * FROM users WHERE email=$1 OR username=$2 FOR UPDATE',
      [email, username]
    );

    if (existing.rows.length > 1) {
      throw new Error('Bootstrap email and username belong to different accounts');
    }

    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (String(row.email).toLowerCase() !== email || String(row.username).toLowerCase() !== username.toLowerCase()) {
        throw new Error('Existing account does not exactly match bootstrap admin identity');
      }

      const updated = await client.query(
        `UPDATE users
         SET role='admin',status='active',updated_at=NOW()
         WHERE id=$1
         RETURNING id,username,email,role,status`,
        [row.id]
      );

      await client.query(
        `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
         VALUES (NULL,'admin.bootstrap.ensure','user',$1,$2)`,
        [row.id.toString(), JSON.stringify({ email })]
      );
      return updated.rows[0];
    }

    const passwordHash = await hashPassword(password);
    const referralCode = 'ADMIN' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const created = await client.query(
      `INSERT INTO users(username,email,password_hash,role,status,referral_code,email_verified_at)
       VALUES ($1,$2,$3,'admin','active',$4,NOW())
       RETURNING id,username,email,role,status`,
      [username, email, passwordHash, referralCode]
    );
    await client.query(
      'INSERT INTO wallet_accounts(user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [created.rows[0].id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
       VALUES (NULL,'admin.bootstrap.create','user',$1,$2)`,
      [created.rows[0].id.toString(), JSON.stringify({ email })]
    );
    return created.rows[0];
  });

  console.log(`admin ready: ${admin.email} (id ${admin.id})`);
}

run()
  .then(async () => pool.end())
  .catch(async error => {
    console.error(error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
