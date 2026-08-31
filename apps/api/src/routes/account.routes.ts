import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';

const router = Router();

router.get('/dashboard', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId.toString();

  const [wallet, today, week, month, referrals, recent] = await Promise.all([
    pool.query('SELECT * FROM wallet_accounts WHERE user_id=$1', [userId]),
    pool.query(`SELECT COALESCE(SUM(reward_points),0) total FROM reward_events WHERE user_id=$1 AND status='credited' AND created_at >= date_trunc('day',NOW())`, [userId]),
    pool.query(`SELECT COALESCE(SUM(reward_points),0) total FROM reward_events WHERE user_id=$1 AND status='credited' AND created_at >= NOW()-INTERVAL '7 days'`, [userId]),
    pool.query(`SELECT COALESCE(SUM(reward_points),0) total FROM reward_events WHERE user_id=$1 AND status='credited' AND created_at >= date_trunc('month',NOW())`, [userId]),
    pool.query('SELECT COUNT(*)::int count FROM users WHERE referred_by=$1', [userId]),
    pool.query(`SELECT id,event_type,reward_points,status,created_at FROM reward_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [userId])
  ]);

  res.json({
    wallet: wallet.rows[0] || { available_points: 0, held_points: 0, lifetime_earned_points: 0 },
    earnings: {
      today: today.rows[0].total,
      week: week.rows[0].total,
      month: month.rows[0].total
    },
    referrals: referrals.rows[0].count,
    recentActivity: recent.rows
  });
});


router.get('/level-progress', requireAuth, async (req: AuthedRequest, res) => {
  const userId=req.auth!.userId.toString();
  const current=await pool.query(
    `SELECT u.level,u.rank,w.lifetime_earned_points
     FROM users u
     JOIN wallet_accounts w ON w.user_id=u.id
     WHERE u.id=$1`,
    [userId]
  );
  const row=current.rows[0];
  if(!row)return res.status(404).json({error:'User not found'});

  const next=await pool.query(
    `SELECT level,rank,min_lifetime_points
     FROM level_rules
     WHERE min_lifetime_points > $1
     ORDER BY min_lifetime_points ASC
     LIMIT 1`,
    [row.lifetime_earned_points]
  );

  const currentRule=await pool.query(
    `SELECT level,rank,min_lifetime_points
     FROM level_rules
     WHERE level=$1
     LIMIT 1`,
    [row.level]
  );

  res.json({
    level:row.level,
    rank:row.rank,
    lifetimePoints:row.lifetime_earned_points,
    currentThreshold:currentRule.rows[0]?.min_lifetime_points ?? 0,
    nextLevel:next.rows[0] ?? null
  });
});

const profileSchema = z.object({
  fullName: z.string().trim().max(100).optional(),
  avatarUrl: z.string().url().max(1000).refine(value => ['http:','https:'].includes(new URL(value).protocol), 'Avatar URL must use http or https').optional().nullable(),
  countryCode: z.string().trim().max(3).optional(),
  bio: z.string().trim().max(500).optional()
});

router.patch('/profile', requireAuth, async (req: AuthedRequest, res) => {
  const input = profileSchema.parse(req.body);
  const r = await pool.query(
    `UPDATE users
     SET full_name=COALESCE($1,full_name),
         avatar_url=COALESCE($2,avatar_url),
         country_code=COALESCE($3,country_code),
         bio=COALESCE($4,bio),
         updated_at=NOW()
     WHERE id=$5
     RETURNING id,username,email,full_name,avatar_url,country_code,bio,level,rank,is_premium`,
    [input.fullName ?? null, input.avatarUrl ?? null, input.countryCode ?? null, input.bio ?? null, req.auth!.userId.toString()]
  );
  res.json(r.rows[0]);
});

router.get('/transactions', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query(
    `SELECT id,direction,points,available_delta,held_delta,debt_delta,available_after,held_after,debt_after,source_type,source_id,metadata,created_at
     FROM wallet_entries
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 100`,
    [req.auth!.userId.toString()]
  );
  res.json(r.rows);
});

router.get('/notifications', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
    [req.auth!.userId.toString()]
  );
  res.json(r.rows);
});

router.patch('/notifications/:id/read', requireAuth, async (req: AuthedRequest, res) => {
  await pool.query(
    'UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2',
    [req.params.id, req.auth!.userId.toString()]
  );
  res.status(204).end();
});

export default router;
