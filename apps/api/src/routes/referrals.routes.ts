import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId.toString();
  const [me, referred, commissions] = await Promise.all([
    pool.query('SELECT referral_code FROM users WHERE id=$1', [userId]),
    pool.query(
      `SELECT id,username,created_at
       FROM users
       WHERE referred_by=$1
       ORDER BY created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT rc.*,u.username AS referred_username,re.created_at AS reward_created_at
       FROM referral_commissions rc
       JOIN users u ON u.id=rc.referred_user_id
       JOIN reward_events re ON re.id=rc.reward_event_id
       WHERE rc.referrer_user_id=$1
       ORDER BY rc.created_at DESC`,
      [userId]
    )
  ]);

  const total = commissions.rows
    .filter(c => c.status === 'credited')
    .reduce((sum, c) => sum + BigInt(c.commission_points), 0n);

  res.json({
    referralCode: me.rows[0]?.referral_code || null,
    totalReferrals: referred.rows.length,
    totalCommissionPoints: total.toString(),
    referrals: referred.rows,
    commissions: commissions.rows
  });
});

export default router;
