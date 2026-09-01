import crypto from 'crypto';
import type pg from 'pg';
import { env } from './config/env.js';
import { HttpError } from './http.js';
import { Wallet } from './wallet.js';

type CreditInput = {
  userId: bigint;
  providerId?: bigint | null;
  eventType: 'offer'|'survey'|'task'|'daily'|'manual'|'watch';
  externalTransactionId?: string | null;
  rewardPoints: bigint;
  rawPayload?: Record<string, unknown>;
  idempotencyKey: string;
};

async function applyReferralCommission(client: pg.PoolClient, rewardEvent: any, userId: bigint, rewardPoints: bigint) {
  if (env.REFERRAL_COMMISSION_BPS <= 0) return null;

  const user = await client.query(
    'SELECT referred_by FROM users WHERE id=$1',
    [userId.toString()]
  );
  const referrerId = user.rows[0]?.referred_by ? BigInt(user.rows[0].referred_by) : null;
  if (!referrerId) return null;

  const commission = (rewardPoints * BigInt(env.REFERRAL_COMMISSION_BPS)) / 10000n;
  if (commission <= 0n) return null;

  const existing = await client.query(
    'SELECT * FROM referral_commissions WHERE reward_event_id=$1 AND referrer_user_id=$2',
    [rewardEvent.id, referrerId.toString()]
  );
  if (existing.rows[0]) return existing.rows[0];

  await Wallet.credit(client, {
    userId: referrerId,
    points: commission,
    sourceType: 'referral',
    sourceId: rewardEvent.id.toString(),
    idempotencyKey: `wallet:referral:${rewardEvent.id}:${referrerId.toString()}`,
    metadata: { referredUserId: userId.toString(), rewardEventId: rewardEvent.id }
  });

  const r = await client.query(
    `INSERT INTO referral_commissions
      (referrer_user_id,referred_user_id,reward_event_id,commission_points,status)
     VALUES ($1,$2,$3,$4,'credited')
     RETURNING *`,
    [referrerId.toString(), userId.toString(), rewardEvent.id, commission.toString()]
  );
  return r.rows[0];
}

export const Rewards = {
  async credit(client: pg.PoolClient, input: CreditInput) {
    if (input.rewardPoints <= 0n) throw new HttpError(400, 'Reward must be positive');
    if (input.rewardPoints > env.MAX_SINGLE_REWARD_POINTS) throw new HttpError(400, 'Reward exceeds platform maximum');

    const prior = await client.query(
      'SELECT * FROM reward_events WHERE idempotency_key=$1',
      [input.idempotencyKey]
    );
    if (prior.rows[0]) return prior.rows[0];

    if (input.providerId && input.externalTransactionId) {
      const duplicate = await client.query(
        `SELECT * FROM reward_events
         WHERE provider_id=$1 AND external_transaction_id=$2`,
        [input.providerId.toString(), input.externalTransactionId]
      );
      if (duplicate.rows[0]) return duplicate.rows[0];
    }

    const event = await client.query(
      `INSERT INTO reward_events
       (user_id,provider_id,event_type,external_transaction_id,reward_points,status,raw_payload,idempotency_key)
       VALUES ($1,$2,$3,$4,$5,'credited',$6,$7)
       RETURNING *`,
      [
        input.userId.toString(),
        input.providerId?.toString() || null,
        input.eventType,
        input.externalTransactionId || null,
        input.rewardPoints.toString(),
        JSON.stringify(input.rawPayload || {}),
        input.idempotencyKey
      ]
    );

    const row = event.rows[0];

    await Wallet.credit(client, {
      userId: input.userId,
      points: input.rewardPoints,
      sourceType: input.eventType,
      sourceId: row.id.toString(),
      idempotencyKey: `wallet:reward:${row.id}`,
      metadata: {
        providerId: input.providerId?.toString() || null,
        externalTransactionId: input.externalTransactionId || null
      }
    });

    await applyReferralCommission(client, row, input.userId, input.rewardPoints);

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'reward','Reward credited',$2)`,
      [input.userId.toString(), `You earned ${input.rewardPoints.toString()} points.`]
    );

    return row;
  },

  async reverse(client: pg.PoolClient, eventId: bigint, reason: string, rawPayload: Record<string, unknown> = {}) {
    const eventResult = await client.query(
      'SELECT * FROM reward_events WHERE id=$1 FOR UPDATE',
      [eventId.toString()]
    );
    const event = eventResult.rows[0];
    if (!event) throw new HttpError(404, 'Reward event not found');
    if (event.status === 'reversed') return event;
    if (event.status !== 'credited') throw new HttpError(409, 'Reward event cannot be reversed');

    const points = BigInt(event.reward_points);

    const userReclaim = await Wallet.reclaim(client, {
      userId: BigInt(event.user_id),
      points,
      sourceType: 'reversal',
      sourceId: event.id.toString(),
      idempotencyKey: `wallet:reward-reversal:${event.id}`,
      metadata: { reason }
    });

    if (BigInt(userReclaim.debt_after || 0) > 0n) {
      await client.query(
        `UPDATE users
         SET withdrawal_locked_at=COALESCE(withdrawal_locked_at,NOW()),
             withdrawal_lock_reason='Outstanding reward debt',
             updated_at=NOW()
         WHERE id=$1`,
        [event.user_id]
      );
      await client.query(
        `INSERT INTO fraud_events(user_id,event_type,severity,metadata)
         VALUES ($1,'reward_reversal_debt','high',$2)`,
        [event.user_id, JSON.stringify({ rewardEventId: event.id, debtPoints: userReclaim.debt_after, reason })]
      );
    }

    const commissions = await client.query(
      `SELECT * FROM referral_commissions
       WHERE reward_event_id=$1 AND status='credited'
       FOR UPDATE`,
      [event.id]
    );

    for (const commission of commissions.rows) {
      const referralReclaim = await Wallet.reclaim(client, {
        userId: BigInt(commission.referrer_user_id),
        points: BigInt(commission.commission_points),
        sourceType: 'referral_reversal',
        sourceId: commission.id.toString(),
        idempotencyKey: `wallet:referral-reversal:${commission.id}`,
        metadata: { rewardEventId: event.id, reason }
      });
      if (BigInt(referralReclaim.debt_after || 0) > 0n) {
        await client.query(
          `UPDATE users
           SET withdrawal_locked_at=COALESCE(withdrawal_locked_at,NOW()),
               withdrawal_lock_reason='Outstanding reward debt',
               updated_at=NOW()
           WHERE id=$1`,
          [commission.referrer_user_id]
        );
        await client.query(
          `INSERT INTO fraud_events(user_id,event_type,severity,metadata)
           VALUES ($1,'referral_reversal_debt','high',$2)`,
          [commission.referrer_user_id, JSON.stringify({ commissionId: commission.id, rewardEventId: event.id, debtPoints: referralReclaim.debt_after, reason })]
        );
      }
      await client.query(
        `UPDATE referral_commissions
         SET status='reversed',reversed_at=NOW()
         WHERE id=$1`,
        [commission.id]
      );
    }

    const updated = await client.query(
      `UPDATE reward_events
       SET status='reversed',
           raw_payload=raw_payload || $2::jsonb,
           updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [event.id, JSON.stringify({ reversalReason: reason, ...rawPayload })]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'warning','Reward reversed',$2)`,
      [event.user_id, `${points.toString()} points were reversed: ${reason}`]
    );

    return updated.rows[0];
  },

  verifyGenericSignature(secret: string, txId: string, userId: string, reward: string, status: string, signature: string) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${txId}:${userId}:${reward}:${status}`)
      .digest('hex');

    const left = Buffer.from(expected);
    const right = Buffer.from(String(signature || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }
};
