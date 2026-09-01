import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool, tx } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { HttpError } from '../http.js';
import { Wallet } from '../wallet.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query(
    'SELECT * FROM withdrawals WHERE user_id=$1 ORDER BY requested_at DESC',
    [req.auth!.userId.toString()]
  );
  res.json(r.rows);
});

router.get('/catalog', requireAuth, async (_req, res) => {
  const r = await pool.query(
    `SELECT id,method_key,name,mode,instructions,account_fields,min_points,fee_bps,sort_order
     FROM payout_method_catalog
     WHERE is_enabled=TRUE
     ORDER BY sort_order ASC,name ASC`
  );
  res.json(r.rows);
});

router.get('/methods', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query(
    `SELECT id,method_key,label,account_details,is_default,created_at
     FROM withdrawal_methods WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC`,
    [req.auth!.userId.toString()]
  );
  res.json(r.rows);
});

const methodSchema = z.object({
  methodKey: z.string().trim().min(2).max(50),
  accountDetails: z.record(z.unknown()),
  isDefault: z.boolean().optional()
});

function validateAccountDetails(fields: unknown, details: Record<string, unknown>) {
  if (!Array.isArray(fields)) return;
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue;
    const field = raw as Record<string, unknown>;
    const key = typeof field.key === 'string' ? field.key : '';
    const required = field.required !== false;
    if (!key || !required) continue;
    const value = details[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new HttpError(400, `Missing payout account field: ${key}`);
    }
  }
}

router.post('/methods', requireAuth, async (req: AuthedRequest, res) => {
  const input = methodSchema.parse(req.body);
  const method = await tx(async client => {
    const catalog = await client.query(
      `SELECT * FROM payout_method_catalog
       WHERE method_key=$1 AND is_enabled=TRUE
       LIMIT 1`,
      [input.methodKey]
    );
    if (!catalog.rows[0]) throw new HttpError(400, 'Unsupported payout method');
    validateAccountDetails(catalog.rows[0].account_fields, input.accountDetails);

    if (input.isDefault) {
      await client.query('UPDATE withdrawal_methods SET is_default=FALSE WHERE user_id=$1', [req.auth!.userId.toString()]);
    }
    const r = await client.query(
      `INSERT INTO withdrawal_methods(user_id,method_key,label,account_details,is_default)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.auth!.userId.toString(), input.methodKey, catalog.rows[0].name, JSON.stringify(input.accountDetails), Boolean(input.isDefault)]
    );
    return r.rows[0];
  });
  res.status(201).json(method);
});

const requestSchema = z.object({
  methodId: z.coerce.bigint(),
  points: z.coerce.bigint().positive(),
  idempotencyKey: z.string().min(8).max(200)
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const input = requestSchema.parse(req.body);
  const withdrawal = await tx(async client => {
    const prior = await client.query('SELECT * FROM withdrawals WHERE idempotency_key=$1', [input.idempotencyKey]);
    if (prior.rows[0]) return prior.rows[0];

    const user = await client.query(
      `SELECT u.id,u.withdrawal_locked_at,u.status,w.debt_points
       FROM users u
       JOIN wallet_accounts w ON w.user_id=u.id
       WHERE u.id=$1
       FOR UPDATE OF u,w`,
      [req.auth!.userId.toString()]
    );
    if (!user.rows[0]) throw new HttpError(404, 'User not found');
    if (user.rows[0].status !== 'active') throw new HttpError(403, 'Account unavailable');
    if (user.rows[0].withdrawal_locked_at) throw new HttpError(403, 'Withdrawals are locked');
    if (BigInt(user.rows[0].debt_points || 0) > 0n) throw new HttpError(403, 'Outstanding reward debt must be settled before cashout');

    const pending = await client.query(
      `SELECT id FROM withdrawals
       WHERE user_id=$1 AND status IN ('pending','in_review','processing') LIMIT 1`,
      [req.auth!.userId.toString()]
    );
    if (pending.rows[0]) throw new HttpError(409, 'A withdrawal is already in progress');

    const method = await client.query(
      'SELECT * FROM withdrawal_methods WHERE id=$1 AND user_id=$2',
      [input.methodId.toString(), req.auth!.userId.toString()]
    );
    if (!method.rows[0]) throw new HttpError(404, 'Withdrawal method not found');

    const catalog = await client.query(
      `SELECT * FROM payout_method_catalog
       WHERE method_key=$1 AND is_enabled=TRUE
       LIMIT 1`,
      [method.rows[0].method_key]
    );
    if (!catalog.rows[0]) throw new HttpError(400, 'Payout method is unavailable');

    const methodMinimum = BigInt(catalog.rows[0].min_points);
    const minimum = methodMinimum > env.MIN_WITHDRAWAL_POINTS ? methodMinimum : env.MIN_WITHDRAWAL_POINTS;
    if (input.points < minimum) {
      throw new HttpError(400, `Minimum withdrawal for ${catalog.rows[0].name} is ${minimum.toString()} points`);
    }
    validateAccountDetails(catalog.rows[0].account_fields, method.rows[0].account_details);

    const feeBps = BigInt(catalog.rows[0].fee_bps || 0);
    const feePoints = feeBps === 0n ? 0n : (input.points * feeBps + 9999n) / 10000n;
    const netPoints = input.points - feePoints;
    if (netPoints <= 0n) throw new HttpError(400, 'Withdrawal fee exceeds payout amount');

    const r = await client.query(
      `INSERT INTO withdrawals
       (user_id,method_id,payout_method_catalog_id,method_key,account_snapshot,points,fee_bps,fee_points,net_points,status,idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
       RETURNING *`,
      [
        req.auth!.userId.toString(),
        method.rows[0].id,
        catalog.rows[0].id,
        method.rows[0].method_key,
        JSON.stringify(method.rows[0].account_details),
        input.points.toString(),
        Number(catalog.rows[0].fee_bps || 0),
        feePoints.toString(),
        netPoints.toString(),
        input.idempotencyKey
      ]
    );

    await Wallet.hold(client, {
      userId: req.auth!.userId,
      points: input.points,
      sourceType: 'withdrawal',
      sourceId: r.rows[0].id.toString(),
      idempotencyKey: `wallet:withdrawal-hold:${r.rows[0].id}`
    });

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'withdrawal','Cashout requested',$2)`,
      [req.auth!.userId.toString(), `Your withdrawal for ${input.points.toString()} points is pending review.`]
    );

    return r.rows[0];
  });

  res.status(201).json(withdrawal);
});

export default router;
