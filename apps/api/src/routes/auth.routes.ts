import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { hashPassword, issueToken, requireAuth, type AuthedRequest, verifyPassword } from '../auth.js';
import { HttpError } from '../http.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(40),
  email: z.string().email().transform(v => v.trim().toLowerCase()),
  password: z.string().min(8).max(200),
  referralCode: z.string().trim().max(64).optional()
});

router.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body);

  const user = await tx(async client => {
    const dupe = await client.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [input.email, input.username]
    );
    if (dupe.rows[0]) throw new HttpError(409, 'Email or username already exists');

    let referredBy: string | null = null;
    if (input.referralCode) {
      const ref = await client.query(
        'SELECT id FROM users WHERE referral_code=$1 AND status=\'active\'',
        [input.referralCode]
      );
      referredBy = ref.rows[0]?.id || null;
    }

    const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    const passwordHash = await hashPassword(input.password);

    const created = await client.query(
      `INSERT INTO users(username,email,password_hash,referral_code,referred_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,username,email,role,status,referral_code,created_at`,
      [input.username, input.email, passwordHash, referralCode, referredBy]
    );

    await client.query(
      'INSERT INTO wallet_accounts(user_id) VALUES ($1)',
      [created.rows[0].id]
    );

    return created.rows[0];
  });

  const token = issueToken(BigInt(user.id), user.role);
  res.status(201).json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email().transform(v => v.trim().toLowerCase()),
  password: z.string().min(1)
});

router.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await pool.query('SELECT * FROM users WHERE email=$1', [input.email]);
  const user = result.rows[0];

  if (!user || !(await verifyPassword(user.password_hash, input.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') throw new HttpError(403, 'Account unavailable');

  const token = issueToken(BigInt(user.id), user.role);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      referralCode: user.referral_code,
      level: user.level,
      rank: user.rank,
      isPremium: user.is_premium
    }
  });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `SELECT u.id,u.username,u.email,u.role,u.status,u.full_name,u.avatar_url,u.country_code,u.bio,
            u.referral_code,u.level,u.rank,u.is_premium,u.premium_expires_at,
            w.available_points,w.held_points,w.lifetime_earned_points
     FROM users u
     LEFT JOIN wallet_accounts w ON w.user_id=u.id
     WHERE u.id=$1`,
    [req.auth!.userId.toString()]
  );
  res.json(result.rows[0]);
});

export default router;
