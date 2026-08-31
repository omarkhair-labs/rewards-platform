import crypto from 'crypto';
import { Router } from 'express';
import { pool, tx } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { HttpError } from '../http.js';
import { Rewards } from '../rewards.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const r = await pool.query(
    `SELECT id,title,media_url,duration_seconds,reward_points,daily_limit
     FROM watch_campaigns
     WHERE is_active=TRUE
     ORDER BY created_at DESC`
  );
  res.json(r.rows);
});

router.post('/:id/start', requireAuth, async (req: AuthedRequest, res) => {
  const result = await tx(async client => {
    const campaign = await client.query(
      'SELECT * FROM watch_campaigns WHERE id=$1 AND is_active=TRUE FOR UPDATE',
      [req.params.id]
    );
    if (!campaign.rows[0]) throw new HttpError(404, 'Campaign not found');

    const count = await client.query(
      `SELECT COUNT(*)::int count
       FROM watch_sessions
       WHERE campaign_id=$1 AND user_id=$2
         AND credited_at IS NOT NULL
         AND started_at>=date_trunc('day',NOW())`,
      [req.params.id, req.auth!.userId.toString()]
    );

    if (count.rows[0].count >= campaign.rows[0].daily_limit) {
      throw new HttpError(409, 'Daily watch limit reached');
    }

    const active = await client.query(
      `SELECT id,started_at
       FROM watch_sessions
       WHERE campaign_id=$1 AND user_id=$2
         AND credited_at IS NULL
         AND started_at>=NOW()-INTERVAL '2 hours'
       ORDER BY started_at DESC
       LIMIT 1`,
      [req.params.id, req.auth!.userId.toString()]
    );

    if (active.rows[0]) {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(active.rows[0].started_at).getTime()) / 1000));
      return {
        sessionId: active.rows[0].id,
        minimumSeconds: campaign.rows[0].duration_seconds,
        remainingSeconds: Math.max(0, Number(campaign.rows[0].duration_seconds) - elapsed),
        resumed: true
      };
    }

    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO watch_sessions(id,campaign_id,user_id,ip_address,metadata)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, req.params.id, req.auth!.userId.toString(), req.ip || null, JSON.stringify({ userAgent: req.headers['user-agent'] || null })]
    );

    return {
      sessionId: id,
      minimumSeconds: campaign.rows[0].duration_seconds,
      remainingSeconds: Number(campaign.rows[0].duration_seconds),
      resumed: false
    };
  });

  res.status(result.resumed ? 200 : 201).json(result);
});

router.post('/sessions/:sessionId/complete', requireAuth, async (req: AuthedRequest, res) => {
  const result = await tx(async client => {
    const sessionResult = await client.query(
      `SELECT ws.*,wc.reward_points,wc.duration_seconds,wc.daily_limit
       FROM watch_sessions ws
       JOIN watch_campaigns wc ON wc.id=ws.campaign_id
       WHERE ws.id=$1 AND ws.user_id=$2
       FOR UPDATE`,
      [req.params.sessionId, req.auth!.userId.toString()]
    );
    const session = sessionResult.rows[0];
    if (!session) throw new HttpError(404, 'Watch session not found');
    if (session.credited_at) return session;

    await client.query(
      'SELECT id FROM watch_campaigns WHERE id=$1 FOR UPDATE',
      [session.campaign_id]
    );

    const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
    if (elapsed < Number(session.duration_seconds)) {
      throw new HttpError(409, 'Video duration has not elapsed');
    }

    const creditedToday = await client.query(
      `SELECT COUNT(*)::int count
       FROM watch_sessions
       WHERE campaign_id=$1 AND user_id=$2
         AND credited_at IS NOT NULL
         AND started_at>=date_trunc('day',NOW())`,
      [session.campaign_id, req.auth!.userId.toString()]
    );
    if (creditedToday.rows[0].count >= session.daily_limit) {
      throw new HttpError(409, 'Daily watch limit reached');
    }

    await Rewards.credit(client, {
      userId: req.auth!.userId,
      eventType: 'watch',
      rewardPoints: BigInt(session.reward_points),
      idempotencyKey: `watch:${session.id}`,
      rawPayload: { campaignId: session.campaign_id, watchSessionId: session.id }
    });

    const updated = await client.query(
      `UPDATE watch_sessions
       SET completed_at=NOW(),credited_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [session.id]
    );
    return updated.rows[0];
  });

  res.json(result);
});

export default router;
