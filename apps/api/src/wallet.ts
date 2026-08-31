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
  debtDelta: bigint,
  availableAfter: bigint,
  heldAfter: bigint,
  debtAfter: bigint
) {
  const r = await client.query(
    `INSERT INTO wallet_entries
      (user_id,direction,points,available_delta,held_delta,debt_delta,available_after,held_after,debt_after,source_type,source_id,idempotency_key,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      input.userId.toString(), direction, input.points.toString(),
      availableDelta.toString(), heldDelta.toString(), debtDelta.toString(),
      availableAfter.toString(), heldAfter.toString(), debtAfter.toString(),
      input.sourceType, input.sourceId || null, input.idempotencyKey,
      JSON.stringify(input.metadata || {})
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
    const currentAvailable = BigInt(wallet.available_points);
    const currentHeld = BigInt(wallet.held_points);
    const currentDebt = BigInt(wallet.debt_points || 0);

    const debtPaid = currentDebt < input.points ? currentDebt : input.points;
    const availableCredit = input.points - debtPaid;
    const available = currentAvailable + availableCredit;
    const debt = currentDebt - debtPaid;

    await client.query(
      `UPDATE wallet_accounts
       SET available_points=$1,debt_points=$2,lifetime_earned_points=lifetime_earned_points+$3,
           version=version+1,updated_at=NOW()
       WHERE user_id=$4`,
      [available.toString(), debt.toString(), input.points.toString(), input.userId.toString()]
    );

    await recalculateLevel(client,input.userId);

    return writeEntry(
      client,input,'credit',availableCredit,0n,-debtPaid,
      available,currentHeld,debt
    );
  },

  async debit(client: pg.PoolClient, input: Mutation) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;

    const wallet = await lockWallet(client, input.userId);
    const current = BigInt(wallet.available_points);
    const held = BigInt(wallet.held_points);
    const debt = BigInt(wallet.debt_points || 0);
    if (current < input.points) throw new HttpError(409, 'Insufficient balance');

    const available = current - input.points;
    await client.query(
      `UPDATE wallet_accounts SET available_points=$1,version=version+1,updated_at=NOW() WHERE user_id=$2`,
      [available.toString(), input.userId.toString()]
    );

    return writeEntry(client,input,'debit',-input.points,0n,0n,available,held,debt);
  },

  async reclaim(client: pg.PoolClient, input: Mutation) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;

    const wallet = await lockWallet(client, input.userId);
    const current = BigInt(wallet.available_points);
    const held = BigInt(wallet.held_points);
    const currentDebt = BigInt(wallet.debt_points || 0);

    const availableDebit = current < input.points ? current : input.points;
    const shortfall = input.points - availableDebit;
    const available = current - availableDebit;
    const debt = currentDebt + shortfall;

    await client.query(
      `UPDATE wallet_accounts
       SET available_points=$1,debt_points=$2,version=version+1,updated_at=NOW()
       WHERE user_id=$3`,
      [available.toString(),debt.toString(),input.userId.toString()]
    );

    return writeEntry(
      client,input,'debit',-availableDebit,0n,shortfall,
      available,held,debt
    );
  },

  async hold(client: pg.PoolClient, input: Mutation) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;

    const wallet = await lockWallet(client, input.userId);
    const current = BigInt(wallet.available_points);
    const currentDebt = BigInt(wallet.debt_points || 0);
    if (currentDebt > 0n) throw new HttpError(409, 'Account has outstanding reward debt');
    if (current < input.points) throw new HttpError(409, 'Insufficient balance');

    const available = current - input.points;
    const held = BigInt(wallet.held_points) + input.points;

    await client.query(
      `UPDATE wallet_accounts SET available_points=$1,held_points=$2,version=version+1,updated_at=NOW() WHERE user_id=$3`,
      [available.toString(), held.toString(), input.userId.toString()]
    );

    return writeEntry(client,input,'hold',-input.points,input.points,0n,available,held,currentDebt);
  },

  async release(client: pg.PoolClient, input: Mutation, settle: boolean) {
    if (input.points <= 0n) throw new HttpError(400, 'Points must be positive');
    const prior = await existing(client, input.idempotencyKey);
    if (prior) return prior;

    const wallet = await lockWallet(client, input.userId);
    const currentHeld = BigInt(wallet.held_points);
    if (currentHeld < input.points) throw new HttpError(409, 'Insufficient held balance');

    const currentAvailable = BigInt(wallet.available_points);
    const currentDebt = BigInt(wallet.debt_points || 0);
    const held = currentHeld - input.points;

    if (settle) {
      await client.query(
        `UPDATE wallet_accounts SET held_points=$1,version=version+1,updated_at=NOW() WHERE user_id=$2`,
        [held.toString(),input.userId.toString()]
      );
      return writeEntry(client,input,'debit',0n,-input.points,0n,currentAvailable,held,currentDebt);
    }

    const debtPaid = currentDebt < input.points ? currentDebt : input.points;
    const releasedAvailable = input.points - debtPaid;
    const available = currentAvailable + releasedAvailable;
    const debt = currentDebt - debtPaid;

    await client.query(
      `UPDATE wallet_accounts
       SET available_points=$1,held_points=$2,debt_points=$3,version=version+1,updated_at=NOW()
       WHERE user_id=$4`,
      [available.toString(),held.toString(),debt.toString(),input.userId.toString()]
    );

    return writeEntry(
      client,input,'release',releasedAvailable,-input.points,-debtPaid,
      available,held,debt
    );
  }
};
