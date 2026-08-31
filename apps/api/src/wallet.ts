import type pg from 'pg';
import { HttpError } from './http.js';

type Mutation = {
  userId: bigint;
  points: bigint;
  sourceType: string;
  sourceId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

async function existing(client: pg.PoolClient, key: string) {
  const r = await client.query('SELECT * FROM wallet_entries WHERE idempotency_key=$1', [key]);
  return r.rows[0] || null;
}

async function lockWallet(client: pg.PoolClient, userId: bigint) {
  await client.query(
    `INSERT INTO wallet_accounts(user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId.toString()]
  );
  const r = await client.query(
    `SELECT * FROM wallet_accounts WHERE user_id=$1 FOR UPDATE`,
    [userId.toString()]
  );
  return r.rows[0];
}


async function recalculateLevel(client: pg.PoolClient, userId: bigint) {
  const current = await client.query(
    `SELECT u.level,u.rank,w.lifetime_earned_points
     FROM users u
     JOIN wallet_accounts w ON w.user_id=u.id
     WHERE u.id=$1
     FOR UPDATE OF u`,
    [userId.toString()]
  );
  const user=current.rows[0];
  if(!user)return;

  const rule = await client.query(
    `SELECT level,rank,min_lifetime_points
     FROM level_rules
     WHERE min_lifetime_points <= $1
     ORDER BY min_lifetime_points DESC
     LIMIT 1`,
    [user.lifetime_earned_points]
  );
  const next=rule.rows[0];
  if(!next)return;

  if(Number(next.level)>Number(user.level)){
    await client.query(
      `UPDATE users SET level=$1,rank=$2,updated_at=NOW() WHERE id=$3`,
      [next.level,next.rank,userId.toString()]
    );
    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'level','Level up',$2)`,
      [userId.toString(),`You reached ${next.rank} — Level ${next.level}.`]
    );
  }
}

async function writeEntry(
  client: pg.PoolClient,
  input: Mutation,
  direction: string,
  availableDelta: bigint,
  heldDelta: bigint,
  availableAfter: bigint,
  heldAfter: bigint
) {
  const r = await client.query(
    `INSERT INTO wallet_entries
      (user_id,direction,points,available_delta,held_delta,available_after,held_after,source_type,source_id,idempotency_key,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      input.userId.toString(), direction, input.points.toString(), availableDelta.toString(), heldDelta.toString(),
      availableAfter.toString(), heldAfter.toString(), input.sourceType, input.sourceId || null,
      input.idempotencyKey, JSON.stringify(input.metadata || {})
    ]
  );
  return r.rows[0];
}

export const Wallet = {
  async credit(client: pg.PoolClient, input: Mutation) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;
    const wallet = await lockWallet(client, input.userId);
    const available = BigInt(wallet.available_points) + input.points;
    const held = BigInt(wallet.held_points);
    await client.query(
      `UPDATE wallet_accounts
       SET available_points=$1,lifetime_earned_points=lifetime_earned_points+$2,version=version+1,updated_at=NOW()
       WHERE user_id=$3`,
      [available.toString(), input.points.toString(), input.userId.toString()]
    );
    await recalculateLevel(client,input.userId);
    return writeEntry(client, input, 'credit', input.points, 0n, available, held);
  },

  async debit(client: pg.PoolClient, input: Mutation) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;
    const wallet = await lockWallet(client, input.userId);
    const current = BigInt(wallet.available_points);
    if (current < input.points) throw new HttpError(409, 'Insufficient balance');
    const available = current - input.points;
    const held = BigInt(wallet.held_points);
    await client.query(
      `UPDATE wallet_accounts SET available_points=$1,version=version+1,updated_at=NOW() WHERE user_id=$2`,
      [available.toString(), input.userId.toString()]
    );
    return writeEntry(client, input, 'debit', -input.points, 0n, available, held);
  },

  async hold(client: pg.PoolClient, input: Mutation) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;
    const wallet = await lockWallet(client, input.userId);
    const current = BigInt(wallet.available_points);
    if (current < input.points) throw new HttpError(409, 'Insufficient balance');
    const available = current - input.points;
    const held = BigInt(wallet.held_points) + input.points;
    await client.query(
      `UPDATE wallet_accounts SET available_points=$1,held_points=$2,version=version+1,updated_at=NOW() WHERE user_id=$3`,
      [available.toString(), held.toString(), input.userId.toString()]
    );
    return writeEntry(client, input, 'hold', -input.points, input.points, available, held);
  },

  async release(client: pg.PoolClient, input: Mutation, settle: boolean) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;
    const wallet = await lockWallet(client, input.userId);
    const currentHeld = BigInt(wallet.held_points);
    if (currentHeld < input.points) throw new HttpError(409, 'Insufficient held balance');
    const held = currentHeld - input.points;
    const available = BigInt(wallet.available_points) + (settle ? 0n : input.points);
    await client.query(
      `UPDATE wallet_accounts SET available_points=$1,held_points=$2,version=version+1,updated_at=NOW() WHERE user_id=$3`,
      [available.toString(), held.toString(), input.userId.toString()]
    );
    return writeEntry(
      client, input, settle ? 'debit' : 'release',
      settle ? 0n : input.points, -input.points, available, held
    );
  }
};
