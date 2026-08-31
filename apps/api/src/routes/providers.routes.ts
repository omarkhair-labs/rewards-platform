import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { HttpError } from '../http.js';
import { Rewards } from '../rewards.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const r = await pool.query(
    `SELECT id,slug,name,kind,wall_url,public_config
     FROM providers
     WHERE is_enabled=TRUE
     ORDER BY kind,name`
  );
  res.json(r.rows);
});

router.get('/offers', requireAuth, async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  const provider = typeof req.query.provider === 'string' ? req.query.provider : null;
  const featured = req.query.featured === 'true';

  const params: unknown[] = [];
  let sql = `
    SELECT o.*,p.slug provider_slug,p.name provider_name
    FROM offers o
    LEFT JOIN providers p ON p.id=o.provider_id
    WHERE o.is_active=TRUE
      AND (o.starts_at IS NULL OR o.starts_at<=NOW())
      AND (o.ends_at IS NULL OR o.ends_at>NOW())
  `;

  if (category) {
    params.push(category);
    sql += ` AND o.category=$${params.length}`;
  }
  if (provider) {
    params.push(provider);
    sql += ` AND p.slug=$${params.length}`;
  }
  if (featured) sql += ' AND o.is_featured=TRUE';

  sql += ' ORDER BY o.is_featured DESC,o.reward_points DESC,o.created_at DESC LIMIT 250';

  const r = await pool.query(sql, params);
  res.json(r.rows);
});

router.post('/offers/:id/click', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId.toString();
  const offer = await pool.query(
    `SELECT o.*,p.slug provider_slug,p.wall_url,p.public_config
     FROM offers o
     LEFT JOIN providers p ON p.id=o.provider_id
     WHERE o.id=$1 AND o.is_active=TRUE`,
    [req.params.id]
  );
  const row = offer.rows[0];
  if (!row) throw new HttpError(404, 'Offer not found');

  const user = await pool.query('SELECT username,email FROM users WHERE id=$1', [userId]);
  const clickToken = crypto.randomUUID();

  await pool.query(
    `INSERT INTO offer_clicks(offer_id,user_id,click_token,ip_address,user_agent)
     VALUES ($1,$2,$3,$4,$5)`,
    [row.id, userId, clickToken, req.ip || null, req.headers['user-agent'] || null]
  );

  let target = String(row.landing_url || row.wall_url || '');
  const values: Record<string,string> = {
    '{user_id}': userId,
    '{subid}': userId,
    '{click_token}': clickToken,
    '{offer_id}': String(row.external_id || row.id),
    '{username}': String(user.rows[0]?.username || ''),
    '{email}': String(user.rows[0]?.email || '')
  };

  for (const [needle,value] of Object.entries(values)) {
    target = target.split(needle).join(encodeURIComponent(value));
  }

  if (!target) throw new HttpError(409, 'Offer provider URL is not configured');
  res.json({ url: target, clickToken });
});

const callbackSchema = z.object({
  transactionId: z.string().min(1).max(255),
  userId: z.coerce.bigint(),
  rewardPoints: z.coerce.bigint().positive(),
  status: z.enum(['completed','reversed']).default('completed'),
  signature: z.string().min(16)
});

router.post('/:slug/postback', async (req, res) => {
  const raw = {
    transactionId: req.body?.transactionId ?? req.query.transactionId ?? req.query.tx ?? req.query.transaction_id,
    userId: req.body?.userId ?? req.query.userId ?? req.query.uid ?? req.query.user_id ?? req.query.subid,
    rewardPoints: req.body?.rewardPoints ?? req.query.rewardPoints ?? req.query.reward ?? req.query.amount,
    status: req.body?.status ?? req.query.status ?? 'completed',
    signature: req.body?.signature ?? req.query.signature ?? req.query.hash
  };
  const input = callbackSchema.parse(raw);

  const providerResult = await pool.query(
    `SELECT * FROM providers WHERE slug=$1 AND is_enabled=TRUE`,
    [req.params.slug.toLowerCase()]
  );
  const provider = providerResult.rows[0];
  if (!provider) throw new HttpError(404, 'Provider not found');

  const secretConfig = provider.secret_config || {};
  const secret = String(secretConfig.postbackSecret || '');
  if (!secret) throw new HttpError(503, 'Provider signature secret is not configured');

  if (!Rewards.verifyGenericSignature(
    secret,
    input.transactionId,
    input.userId.toString(),
    input.rewardPoints.toString(),
    input.signature
  )) {
    throw new HttpError(403, 'Invalid provider signature');
  }

  const result = await tx(async client => {
    if (input.status === 'reversed') {
      const event = await client.query(
        `SELECT id FROM reward_events
         WHERE provider_id=$1 AND external_transaction_id=$2
         LIMIT 1`,
        [provider.id, input.transactionId]
      );
      if (!event.rows[0]) throw new HttpError(404, 'Original reward not found');
      return Rewards.reverse(
        client,
        BigInt(event.rows[0].id),
        `${provider.slug} provider reversal`,
        { providerPayload: req.body || req.query }
      );
    }

    return Rewards.credit(client, {
      userId: input.userId,
      providerId: BigInt(provider.id),
      eventType: provider.kind === 'survey' ? 'survey' : 'offer',
      externalTransactionId: input.transactionId,
      rewardPoints: input.rewardPoints,
      rawPayload: { providerPayload: req.body || req.query },
      idempotencyKey: `provider:${provider.id}:${input.transactionId}`
    });
  });

  res.json({ ok: true, event: result });
});

export default router;
