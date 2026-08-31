import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { HttpError } from '../http.js';
import { Rewards } from '../rewards.js';
import { parsePositiveId } from '../security.js';

const router = Router();

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function provider(slug: string) {
  const r = await pool.query(
    'SELECT * FROM providers WHERE slug=$1 AND is_enabled=TRUE',
    [slug]
  );
  if (!r.rows[0]) throw new HttpError(503, `${slug} is not enabled`);
  return r.rows[0];
}

function rewardScale(row: any) {
  const value = Number(row.public_config?.rewardScale ?? 1);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function toPoints(raw: string | number, scale: number) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, 'Invalid reward amount');
  const points = BigInt(Math.round(value * scale));
  if (points <= 0n) throw new HttpError(400, 'Invalid reward amount');
  return points;
}

async function originalEvent(providerId: string, txId: string) {
  const r = await pool.query(
    `SELECT id FROM reward_events
     WHERE provider_id=$1 AND external_transaction_id=$2
     ORDER BY id DESC LIMIT 1`,
    [providerId, txId]
  );
  return r.rows[0]?.id ? BigInt(r.rows[0].id) : null;
}

const lootablySchema = z.object({
  userID: z.string().min(1).max(100),
  transactionID: z.string().min(1).max(255),
  ip: z.string().min(1).max(100),
  revenue: z.string().min(1).max(100),
  currencyReward: z.string().min(1).max(100),
  status: z.enum(['0','1']).default('1'),
  hash: z.string().min(32).max(128)
});

router.get('/lootably', async (req, res) => {
  const input = lootablySchema.parse({
    userID: req.query.userID,
    transactionID: req.query.transactionID,
    ip: req.query.ip ?? req.query.userIP,
    revenue: req.query.revenue,
    currencyReward: req.query.currencyReward ?? req.query.reward,
    status: req.query.status ?? '1',
    hash: req.query.hash
  });

  const p = await provider('lootably');
  const secret = String(p.secret_config?.postbackSecret || '');
  if (!secret) throw new HttpError(503, 'Lootably postback secret is not configured');

  const expected = crypto
    .createHash('sha256')
    .update(input.userID + input.ip + input.revenue + input.currencyReward + secret)
    .digest('hex');

  if (!safeEqual(expected, input.hash)) throw new HttpError(403, 'Invalid Lootably hash');

  if (input.status === '0') {
    const eventId = await originalEvent(String(p.id), input.transactionID);
    if (!eventId) return res.type('text/plain').send('1');

    await tx(client =>
      Rewards.reverse(client, eventId, 'Lootably chargeback', {
        providerPayload: req.query
      })
    );
    return res.type('text/plain').send('1');
  }

  await tx(client =>
    Rewards.credit(client, {
      userId: parsePositiveId(input.userID, 'Lootably user ID'),
      providerId: BigInt(p.id),
      eventType: 'offer',
      externalTransactionId: input.transactionID,
      rewardPoints: toPoints(input.currencyReward, rewardScale(p)),
      rawPayload: { providerPayload: req.query },
      idempotencyKey: `lootably:${input.transactionID}`
    })
  );

  return res.type('text/plain').send('1');
});

function fullPublicUrl(req: any) {
  const configured = String(process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  if (configured) return configured + req.originalUrl;
  const protoHeader = String(req.get('x-forwarded-proto') || req.protocol || 'https');
  const proto = protoHeader.split(',')[0]?.trim() || 'https';
  return `${proto}://${req.get('host')}${req.originalUrl}`;
}

function bitlabsUrlWithoutHash(url: string) {
  const index = url.lastIndexOf('&hash=');
  if (index >= 0) return url.slice(0, index);
  const qIndex = url.lastIndexOf('?hash=');
  if (qIndex >= 0) return url.slice(0, qIndex);
  return url;
}

router.get('/bitlabs', async (req, res) => {
  const p = await provider('bitlabs');
  const secret = String(p.secret_config?.appSecret || '');
  if (!secret) throw new HttpError(503, 'BitLabs app secret is not configured');

  const receivedHash = String(req.query.hash || '');
  if (!receivedHash) throw new HttpError(403, 'Missing BitLabs hash');

  const url = fullPublicUrl(req);
  const unsignedUrl = bitlabsUrlWithoutHash(url);
  const expected = crypto.createHmac('sha1', secret).update(unsignedUrl).digest('hex');
  if (!safeEqual(expected.toLowerCase(), receivedHash.toLowerCase())) {
    throw new HttpError(403, 'Invalid BitLabs hash');
  }

  const uid = String(req.query.uid ?? req.query.UID ?? '');
  const txId = String(req.query.tx ?? req.query.TX ?? req.query.transaction_id ?? '');
  const ref = String(req.query.ref ?? req.query.REF ?? '');
  const rawReward = String(req.query.val ?? req.query.VAL ?? req.query.reward ?? '');
  const activityType = String(req.query.type ?? req.query.TYPE ?? 'COMPLETE').toUpperCase();
  const offerState = String(req.query.offer_state ?? '').toUpperCase();

  if (!uid || !txId) throw new HttpError(400, 'Missing BitLabs UID or TX');

  const reversal =
    activityType.includes('RECONCILIATION') ||
    activityType.includes('REVERSE') ||
    offerState === 'RECONCILED';

  if (reversal) {
    const originalTx = ref || txId;
    const eventId = await originalEvent(String(p.id), originalTx);
    if (!eventId) return res.status(200).json({ ok: true, ignored: 'original_not_found' });

    const event = await tx(client =>
      Rewards.reverse(client, eventId, 'BitLabs reconciliation', {
        providerPayload: req.query,
        reconciliationTx: txId
      })
    );
    return res.json({ ok: true, event });
  }

  const points = toPoints(rawReward, rewardScale(p));
  const eventType = activityType === 'SCREENOUT' ? 'survey' : 'survey';

  const event = await tx(client =>
    Rewards.credit(client, {
      userId: parsePositiveId(uid, 'BitLabs user ID'),
      providerId: BigInt(p.id),
      eventType,
      externalTransactionId: txId,
      rewardPoints: points,
      rawPayload: { providerPayload: req.query, activityType, offerState },
      idempotencyKey: `bitlabs:${txId}`
    })
  );

  return res.json({ ok: true, event });
});

router.post('/adgem/v3', async (req: any, res) => {
  const p = await provider('adgem');
  const secret = String(p.secret_config?.postbackKey || '');
  if (!secret) throw new HttpError(503, 'AdGem postback key is not configured');

  const signature = String(req.get('Signature') || '');
  if (!signature) throw new HttpError(403, 'Missing AdGem signature');

  const rawBody: Buffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqual(expected, signature)) throw new HttpError(403, 'Invalid AdGem signature');

  const body = req.body || {};
  const data = body.data || {};
  const requestId = String(body.request_id || '');
  const conversionId = String(data.conversion_id || requestId);
  const playerId = String(data.player_id || '');
  const conversionType = String(data.conversion_type || '').toLowerCase();

  if (!conversionId || !playerId) throw new HttpError(400, 'Invalid AdGem payload');

  if (conversionType && conversionType !== 'reward') {
    return res.status(200).json({ ok: true, ignored: conversionType });
  }

  const points = toPoints(data.amount, rewardScale(p));

  const event = await tx(client =>
    Rewards.credit(client, {
      userId: parsePositiveId(playerId, 'AdGem player ID'),
      providerId: BigInt(p.id),
      eventType: 'offer',
      externalTransactionId: conversionId,
      rewardPoints: points,
      rawPayload: { requestId, providerPayload: body },
      idempotencyKey: `adgem:${conversionId}`
    })
  );

  return res.status(200).json({ ok: true, event });
});


function theoremReachUnsignedUrl(url: string) {
  const ampIndex = url.lastIndexOf('&hash=');
  if (ampIndex >= 0) return url.slice(0, ampIndex);
  const queryIndex = url.lastIndexOf('?hash=');
  if (queryIndex >= 0) return url.slice(0, queryIndex);
  return url;
}

function theoremReachHash(urlBeforeHash: string, secret: string) {
  return crypto
    .createHmac('sha1', secret)
    .update(urlBeforeHash)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .replace(/\n/g, '');
}

router.get('/theoremreach', async (req, res) => {
  const p = await provider('theoremreach');
  const secret = String(p.secret_config?.secretKey || '');
  if (!secret) throw new HttpError(503, 'TheoremReach secret key is not configured');

  const txId = String(req.query.transaction_id || '');
  const rawReward = String(req.query.reward || '');
  const receivedHash = String(req.query.hash || '');
  const debug = String(req.query.debug || '').toLowerCase() === 'true';

  if (!txId || !rawReward || !receivedHash) {
    throw new HttpError(400, 'Invalid TheoremReach callback');
  }

  const unsignedUrl = theoremReachUnsignedUrl(fullPublicUrl(req));
  const expected = theoremReachHash(unsignedUrl, secret);
  if (!safeEqual(expected, receivedHash)) {
    throw new HttpError(403, 'Invalid TheoremReach hash');
  }

  const sessionResult = await pool.query(
    `SELECT * FROM provider_sessions
     WHERE provider_id=$1 AND external_transaction_id=$2
     LIMIT 1`,
    [p.id, txId]
  );
  const session = sessionResult.rows[0];
  if (!session) throw new HttpError(404, 'TheoremReach session not found');

  if (debug) {
    return res.status(200).json({ ok: true, debug: true, credited: false });
  }

  const event = await tx(async client => {
    const credited = await Rewards.credit(client, {
      userId: BigInt(session.user_id),
      providerId: BigInt(p.id),
      eventType: 'survey',
      externalTransactionId: txId,
      rewardPoints: toPoints(rawReward, rewardScale(p)),
      rawPayload: {
        providerPayload: req.query,
        currency: req.query.currency ?? null,
        partnerId: req.query.partner_id ?? null
      },
      idempotencyKey: `theoremreach:${txId}`
    });

    await client.query(
      `UPDATE provider_sessions
       SET completed_at=COALESCE(completed_at,NOW())
       WHERE provider_id=$1 AND external_transaction_id=$2`,
      [p.id, txId]
    );

    return credited;
  });

  return res.status(200).json({ ok: true, event });
});

export default router;
