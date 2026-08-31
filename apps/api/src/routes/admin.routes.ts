import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { requireRole, type AuthedRequest } from '../auth.js';
import { HttpError } from '../http.js';
import { Rewards } from '../rewards.js';
import { Wallet } from '../wallet.js';

const router = Router();
router.use(requireRole('admin','moderator'));

async function audit(client: any, actor: bigint, action: string, entityType: string, entityId: string | null, metadata: unknown = {}) {
  await client.query(
    `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
     VALUES ($1,$2,$3,$4,$5)`,
    [actor.toString(), action, entityType, entityId, JSON.stringify(metadata)]
  );
}

router.get('/dashboard', async (_req, res) => {
  const [users, pendingTasks, pendingWithdrawals, rewards, fraud] = await Promise.all([
    pool.query('SELECT COUNT(*)::int count FROM users'),
    pool.query(`SELECT COUNT(*)::int count FROM task_submissions WHERE status IN ('pending','in_review')`),
    pool.query(`SELECT COUNT(*)::int count FROM withdrawals WHERE status IN ('pending','in_review','processing')`),
    pool.query(`SELECT COALESCE(SUM(reward_points),0) total FROM reward_events WHERE status='credited'`),
    pool.query(`SELECT COUNT(*)::int count FROM fraud_events WHERE created_at>=NOW()-INTERVAL '24 hours'`)
  ]);
  res.json({
    users: users.rows[0].count,
    taskQueue: pendingTasks.rows[0].count,
    withdrawalQueue: pendingWithdrawals.rows[0].count,
    creditedRewardPoints: rewards.rows[0].total,
    fraudEvents24h: fraud.rows[0].count
  });
});

router.get('/users', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const params: unknown[] = [];
  let sql = `
    SELECT u.id,u.username,u.email,u.role,u.status,u.level,u.rank,u.is_premium,u.created_at,
           w.available_points,w.held_points,w.lifetime_earned_points
    FROM users u LEFT JOIN wallet_accounts w ON w.user_id=u.id
  `;
  if (q) {
    params.push(`%${q}%`);
    sql += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1`;
  }
  sql += ' ORDER BY u.created_at DESC LIMIT 200';
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

const userPatch = z.object({
  status: z.enum(['active','suspended','banned']).optional(),
  role: z.enum(['user','moderator','admin']).optional(),
  isPremium: z.boolean().optional(),
  withdrawalLocked: z.boolean().optional(),
  withdrawalLockReason: z.string().trim().max(500).optional()
});

router.patch('/users/:id', async (req: AuthedRequest, res) => {
  const input = userPatch.parse(req.body);
  const targetId = String(req.params.id);
  const updated = await tx(async client => {
    const current = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [targetId]);
    if (!current.rows[0]) throw new HttpError(404, 'User not found');

    const r = await client.query(
      `UPDATE users SET
       status=COALESCE($1,status),
       role=COALESCE($2,role),
       is_premium=COALESCE($3,is_premium),
       withdrawal_locked_at=CASE
         WHEN $4::boolean IS TRUE THEN COALESCE(withdrawal_locked_at,NOW())
         WHEN $4::boolean IS FALSE THEN NULL
         ELSE withdrawal_locked_at END,
       withdrawal_lock_reason=CASE
         WHEN $4::boolean IS FALSE THEN NULL
         WHEN $5::text IS NOT NULL THEN $5
         ELSE withdrawal_lock_reason END,
       updated_at=NOW()
       WHERE id=$6
       RETURNING id,username,email,role,status,is_premium,withdrawal_locked_at,withdrawal_lock_reason`,
      [
        input.status || null,
        input.role || null,
        input.isPremium ?? null,
        input.withdrawalLocked ?? null,
        input.withdrawalLockReason ?? null,
        targetId
      ]
    );
    await audit(client, req.auth!.userId, 'user.update', 'user', targetId, input);
    return r.rows[0];
  });
  res.json(updated);
});

const taskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).default(''),
  category: z.string().trim().min(2).max(80),
  rewardPoints: z.coerce.bigint().positive(),
  imageUrl: z.string().url().max(2000).optional(),
  proofType: z.enum(['url','text','file','none']).default('url'),
  instructions: z.array(z.unknown()).default([]),
  maxCompletions: z.number().int().positive().optional(),
  isRepeatable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional()
});

router.get('/tasks', async (_req, res) => {
  const r = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
  res.json(r.rows);
});

router.post('/tasks', async (req: AuthedRequest, res) => {
  const input = taskSchema.parse(req.body);
  const task = await tx(async client => {
    const r = await client.query(
      `INSERT INTO tasks(title,description,category,reward_points,image_url,proof_type,instructions,max_completions,is_repeatable,is_active,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        input.title,input.description,input.category,input.rewardPoints.toString(),input.imageUrl || null,input.proofType,
        JSON.stringify(input.instructions),input.maxCompletions || null,input.isRepeatable,input.isActive,input.expiresAt || null
      ]
    );
    await audit(client, req.auth!.userId, 'task.create', 'task', r.rows[0].id.toString(), input);
    return r.rows[0];
  });
  res.status(201).json(task);
});


const offerSchema = z.object({
  providerId: z.coerce.bigint().optional().nullable(),
  externalId: z.string().trim().max(255).optional().nullable(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).default(''),
  category: z.string().trim().min(2).max(80),
  rewardPoints: z.coerce.bigint().min(0n),
  imageUrl: z.string().url().max(2000).optional().nullable(),
  landingUrl: z.string().url().max(4000).optional().nullable(),
  difficulty: z.string().trim().max(50).optional().nullable(),
  estimatedMinutes: z.coerce.number().int().positive().optional().nullable(),
  allowedCountries: z.array(z.string().trim().min(2).max(3)).default([]),
  requirements: z.array(z.unknown()).default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable()
});

const offerPatchSchema = offerSchema.partial();

router.get('/offers', async (_req, res) => {
  const r = await pool.query(
    `SELECT o.*,p.slug provider_slug,p.name provider_name
     FROM offers o
     LEFT JOIN providers p ON p.id=o.provider_id
     ORDER BY o.created_at DESC`
  );
  res.json(r.rows);
});

router.post('/offers', async (req: AuthedRequest, res) => {
  const input = offerSchema.parse(req.body);
  const created = await tx(async client => {
    const r = await client.query(
      `INSERT INTO offers
       (provider_id,external_id,title,description,category,reward_points,image_url,landing_url,difficulty,estimated_minutes,
        allowed_countries,requirements,is_featured,is_active,starts_at,ends_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        input.providerId?.toString() || null,
        input.externalId || null,
        input.title,
        input.description,
        input.category,
        input.rewardPoints.toString(),
        input.imageUrl || null,
        input.landingUrl || null,
        input.difficulty || null,
        input.estimatedMinutes || null,
        input.allowedCountries,
        JSON.stringify(input.requirements),
        input.isFeatured,
        input.isActive,
        input.startsAt || null,
        input.endsAt || null
      ]
    );
    await audit(client, req.auth!.userId, 'offer.create', 'offer', r.rows[0].id.toString(), input);
    return r.rows[0];
  });
  res.status(201).json(created);
});

router.patch('/offers/:id', async (req: AuthedRequest, res) => {
  const input = offerPatchSchema.parse(req.body);
  const offerId = String(req.params.id);
  const updated = await tx(async client => {
    const current = await client.query('SELECT * FROM offers WHERE id=$1 FOR UPDATE', [offerId]);
    if (!current.rows[0]) throw new HttpError(404, 'Offer not found');
    const before = current.rows[0];

    const next = {
      providerId: input.providerId !== undefined ? input.providerId?.toString() || null : before.provider_id,
      externalId: input.externalId !== undefined ? input.externalId : before.external_id,
      title: input.title ?? before.title,
      description: input.description ?? before.description,
      category: input.category ?? before.category,
      rewardPoints: input.rewardPoints !== undefined ? input.rewardPoints.toString() : before.reward_points,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : before.image_url,
      landingUrl: input.landingUrl !== undefined ? input.landingUrl : before.landing_url,
      difficulty: input.difficulty !== undefined ? input.difficulty : before.difficulty,
      estimatedMinutes: input.estimatedMinutes !== undefined ? input.estimatedMinutes : before.estimated_minutes,
      allowedCountries: input.allowedCountries ?? before.allowed_countries,
      requirements: input.requirements ?? before.requirements,
      isFeatured: input.isFeatured ?? before.is_featured,
      isActive: input.isActive ?? before.is_active,
      startsAt: input.startsAt !== undefined ? input.startsAt : before.starts_at,
      endsAt: input.endsAt !== undefined ? input.endsAt : before.ends_at
    };

    const r = await client.query(
      `UPDATE offers SET
       provider_id=$1,external_id=$2,title=$3,description=$4,category=$5,reward_points=$6,image_url=$7,landing_url=$8,
       difficulty=$9,estimated_minutes=$10,allowed_countries=$11,requirements=$12,is_featured=$13,is_active=$14,
       starts_at=$15,ends_at=$16,updated_at=NOW()
       WHERE id=$17
       RETURNING *`,
      [
        next.providerId,next.externalId,next.title,next.description,next.category,next.rewardPoints,next.imageUrl,next.landingUrl,
        next.difficulty,next.estimatedMinutes,next.allowedCountries,JSON.stringify(next.requirements),next.isFeatured,next.isActive,
        next.startsAt,next.endsAt,offerId
      ]
    );
    await audit(client, req.auth!.userId, 'offer.update', 'offer', offerId, input);
    return r.rows[0];
  });
  res.json(updated);
});

router.patch('/tasks/:id', async (req: AuthedRequest, res) => {
  const input = taskSchema.partial().parse(req.body);
  const taskId = String(req.params.id);
  const updated = await tx(async client => {
    const current = await client.query('SELECT * FROM tasks WHERE id=$1 FOR UPDATE', [taskId]);
    if (!current.rows[0]) throw new HttpError(404, 'Task not found');
    const before = current.rows[0];
    const r = await client.query(
      `UPDATE tasks SET
       title=$1,description=$2,category=$3,reward_points=$4,image_url=$5,proof_type=$6,instructions=$7,
       max_completions=$8,is_repeatable=$9,is_active=$10,expires_at=$11,updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [
        input.title ?? before.title,
        input.description ?? before.description,
        input.category ?? before.category,
        input.rewardPoints !== undefined ? input.rewardPoints.toString() : before.reward_points,
        input.imageUrl !== undefined ? input.imageUrl || null : before.image_url,
        input.proofType ?? before.proof_type,
        JSON.stringify(input.instructions ?? before.instructions),
        input.maxCompletions !== undefined ? input.maxCompletions || null : before.max_completions,
        input.isRepeatable ?? before.is_repeatable,
        input.isActive ?? before.is_active,
        input.expiresAt !== undefined ? input.expiresAt || null : before.expires_at,
        taskId
      ]
    );
    await audit(client, req.auth!.userId, 'task.update', 'task', taskId, input);
    return r.rows[0];
  });
  res.json(updated);
});

router.get('/task-submissions', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const params: unknown[] = [];
  let sql = `
    SELECT s.*,t.title task_title,t.reward_points,u.username,u.email
    FROM task_submissions s
    JOIN tasks t ON t.id=s.task_id
    JOIN users u ON u.id=s.user_id
  `;
  if (status) {
    params.push(status);
    sql += ' WHERE s.status=$1';
  }
  sql += ' ORDER BY s.submitted_at ASC LIMIT 300';
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

const reviewSchema = z.object({
  decision: z.enum(['in_review','approved','rejected']),
  note: z.string().trim().max(1000).optional()
});

router.patch('/task-submissions/:id', async (req: AuthedRequest, res) => {
  const input = reviewSchema.parse(req.body);
  const result = await tx(async client => {
    const s = await client.query(
      `SELECT s.*,t.reward_points,t.completions_count,t.max_completions
       FROM task_submissions s
       JOIN tasks t ON t.id=s.task_id
       WHERE s.id=$1
       FOR UPDATE OF s`,
      [String(req.params.id)]
    );
    const row = s.rows[0];
    if (!row) throw new HttpError(404, 'Submission not found');

    if (row.status === 'approved' || row.status === 'rejected') {
      throw new HttpError(409, 'Submission already finalized');
    }

    if (input.decision === 'approved') {
      const task = await client.query('SELECT * FROM tasks WHERE id=$1 FOR UPDATE', [row.task_id]);
      if (task.rows[0].max_completions !== null && task.rows[0].completions_count >= task.rows[0].max_completions) {
        throw new HttpError(409, 'Task quota reached');
      }

      await Rewards.credit(client, {
        userId: BigInt(row.user_id),
        eventType: 'task',
        rewardPoints: BigInt(row.reward_points),
        idempotencyKey: `task-submission:${row.id}`,
        rawPayload: { taskId: row.task_id, submissionId: row.id }
      });

      await client.query(
        'UPDATE tasks SET completions_count=completions_count+1,updated_at=NOW() WHERE id=$1',
        [row.task_id]
      );
    }

    const updated = await client.query(
      `UPDATE task_submissions
       SET status=$1,reviewer_id=$2,review_note=$3,reviewed_at=CASE WHEN $1 IN ('approved','rejected') THEN NOW() ELSE reviewed_at END
       WHERE id=$4
       RETURNING *`,
      [input.decision, req.auth!.userId.toString(), input.note || null, row.id]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'task',$2,$3)`,
      [
        row.user_id,
        input.decision === 'approved' ? 'Task approved' : input.decision === 'rejected' ? 'Task rejected' : 'Task under review',
        input.note || `Your task submission is now ${input.decision.replace('_',' ')}.`
      ]
    );

    await audit(client, req.auth!.userId, `task_submission.${input.decision}`, 'task_submission', row.id.toString(), { note: input.note || null });
    return updated.rows[0];
  });
  res.json(result);
});

router.get('/withdrawals', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const params: unknown[] = [];
  let sql = `
    SELECT w.*,u.username,u.email
    FROM withdrawals w
    JOIN users u ON u.id=w.user_id
  `;
  if (status) {
    params.push(status);
    sql += ' WHERE w.status=$1';
  }
  sql += ' ORDER BY w.requested_at ASC LIMIT 300';
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

const withdrawalReview = z.object({
  status: z.enum(['in_review','processing','paid','rejected','failed']),
  providerReference: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(1000).optional()
});

router.patch('/withdrawals/:id', async (req: AuthedRequest, res) => {
  const input = withdrawalReview.parse(req.body);
  const result = await tx(async client => {
    const wr = await client.query('SELECT * FROM withdrawals WHERE id=$1 FOR UPDATE', [String(req.params.id)]);
    const row = wr.rows[0];
    if (!row) throw new HttpError(404, 'Withdrawal not found');
    if (['paid','rejected','failed','cancelled'].includes(row.status)) throw new HttpError(409, 'Withdrawal already finalized');

    if (input.status === 'paid') {
      await Wallet.release(client, {
        userId: BigInt(row.user_id),
        points: BigInt(row.points),
        sourceType: 'withdrawal',
        sourceId: row.id.toString(),
        idempotencyKey: `wallet:withdrawal-settle:${row.id}`
      }, true);
    }

    if (input.status === 'rejected' || input.status === 'failed') {
      await Wallet.release(client, {
        userId: BigInt(row.user_id),
        points: BigInt(row.points),
        sourceType: 'withdrawal',
        sourceId: row.id.toString(),
        idempotencyKey: `wallet:withdrawal-release:${row.id}`
      }, false);
    }

    const updated = await client.query(
      `UPDATE withdrawals SET
       status=$1,
       provider_reference=COALESCE($2,provider_reference),
       rejection_reason=CASE WHEN $1 IN ('rejected','failed') THEN COALESCE($3,rejection_reason) ELSE rejection_reason END,
       processed_at=CASE WHEN $1 IN ('paid','rejected','failed') THEN NOW() ELSE processed_at END
       WHERE id=$4
       RETURNING *`,
      [input.status, input.providerReference || null, input.reason || null, row.id]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'withdrawal',$2,$3)`,
      [
        row.user_id,
        `Withdrawal ${input.status.replace('_',' ')}`,
        input.reason || `Your withdrawal is now ${input.status.replace('_',' ')}.`
      ]
    );

    await audit(client, req.auth!.userId, `withdrawal.${input.status}`, 'withdrawal', row.id.toString(), input);
    return updated.rows[0];
  });
  res.json(result);
});

const providerSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(100),
  kind: z.enum(['offerwall','survey','payout']),
  wallUrl: z.string().url().optional(),
  apiBaseUrl: z.string().url().optional(),
  publicConfig: z.record(z.unknown()).default({}),
  secretConfig: z.record(z.unknown()).default({}),
  signatureMode: z.string().trim().max(50).default('hmac_sha256'),
  isEnabled: z.boolean().default(false)
});

router.get('/providers', async (_req, res) => {
  const r = await pool.query(
    `SELECT id,slug,name,kind,wall_url,api_base_url,public_config,signature_mode,is_enabled,created_at,updated_at
     FROM providers ORDER BY kind,name`
  );
  res.json(r.rows);
});

router.post('/providers', async (req: AuthedRequest, res) => {
  const input = providerSchema.parse(req.body);
  const provider = await tx(async client => {
    const r = await client.query(
      `INSERT INTO providers(slug,name,kind,wall_url,api_base_url,public_config,secret_config,signature_mode,is_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id,slug,name,kind,wall_url,api_base_url,public_config,signature_mode,is_enabled`,
      [
        input.slug,input.name,input.kind,input.wallUrl || null,input.apiBaseUrl || null,
        JSON.stringify(input.publicConfig),JSON.stringify(input.secretConfig),input.signatureMode,input.isEnabled
      ]
    );
    await audit(client, req.auth!.userId, 'provider.create', 'provider', r.rows[0].id.toString(), { ...input, secretConfig: '[redacted]' });
    return r.rows[0];
  });
  res.status(201).json(provider);
});

router.patch('/providers/:id', async (req: AuthedRequest, res) => {
  const input = providerSchema.partial().parse(req.body);
  const providerId = String(req.params.id);
  const updated = await tx(async client => {
    const current = await client.query('SELECT * FROM providers WHERE id=$1 FOR UPDATE', [providerId]);
    if (!current.rows[0]) throw new HttpError(404, 'Provider not found');
    const before = current.rows[0];

    const mergedPublic = input.publicConfig !== undefined ? input.publicConfig : before.public_config;
    const mergedSecret = input.secretConfig !== undefined ? input.secretConfig : before.secret_config;

    const r = await client.query(
      `UPDATE providers SET
       slug=$1,name=$2,kind=$3,wall_url=$4,api_base_url=$5,public_config=$6,secret_config=$7,
       signature_mode=$8,is_enabled=$9,updated_at=NOW()
       WHERE id=$10
       RETURNING id,slug,name,kind,wall_url,api_base_url,public_config,signature_mode,is_enabled,created_at,updated_at`,
      [
        input.slug ?? before.slug,
        input.name ?? before.name,
        input.kind ?? before.kind,
        input.wallUrl !== undefined ? input.wallUrl || null : before.wall_url,
        input.apiBaseUrl !== undefined ? input.apiBaseUrl || null : before.api_base_url,
        JSON.stringify(mergedPublic),
        JSON.stringify(mergedSecret),
        input.signatureMode ?? before.signature_mode,
        input.isEnabled ?? before.is_enabled,
        providerId
      ]
    );
    await audit(client, req.auth!.userId, 'provider.update', 'provider', providerId, {
      ...input,
      ...(input.secretConfig !== undefined ? { secretConfig: '[redacted]' } : {})
    });
    return r.rows[0];
  });
  res.json(updated);
});


router.get('/fraud-events', async (_req, res) => {
  const r = await pool.query(
    `SELECT f.*,u.username,u.email
     FROM fraud_events f
     LEFT JOIN users u ON u.id=f.user_id
     ORDER BY f.created_at DESC
     LIMIT 300`
  );
  res.json(r.rows);
});

router.get('/audit-logs', async (_req, res) => {
  const r = await pool.query(
    `SELECT a.*,u.username actor_username
     FROM audit_logs a
     LEFT JOIN users u ON u.id=a.actor_user_id
     ORDER BY a.created_at DESC
     LIMIT 300`
  );
  res.json(r.rows);
});

export default router;
