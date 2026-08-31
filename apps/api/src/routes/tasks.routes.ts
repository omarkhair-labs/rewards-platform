import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { HttpError } from '../http.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query(
    `SELECT t.*,
            EXISTS(
              SELECT 1 FROM task_submissions s
              WHERE s.task_id=t.id AND s.user_id=$1 AND s.status IN ('pending','in_review','approved')
            ) AS already_submitted
     FROM tasks t
     WHERE t.is_active=TRUE
       AND (t.starts_at IS NULL OR t.starts_at<=NOW())
       AND (t.expires_at IS NULL OR t.expires_at>NOW())
       AND (t.max_completions IS NULL OR t.completions_count<t.max_completions)
     ORDER BY t.created_at DESC`,
    [req.auth!.userId.toString()]
  );
  res.json(r.rows);
});

const submitSchema = z.object({
  proofUrl: z.string().url().max(2000).optional(),
  proofText: z.string().trim().max(4000).optional(),
  proofFileUrl: z.string().url().max(2000).optional()
});

router.post('/:id/submit', requireAuth, async (req: AuthedRequest, res) => {
  const input = submitSchema.parse(req.body);
  const submission = await tx(async client => {
    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id=$1 AND is_active=TRUE FOR UPDATE',
      [req.params.id]
    );
    const task = taskResult.rows[0];
    if (!task) throw new HttpError(404, 'Task not found');

    if (task.expires_at && new Date(task.expires_at) <= new Date()) {
      throw new HttpError(410, 'Task expired');
    }

    if (task.max_completions !== null && task.completions_count >= task.max_completions) {
      throw new HttpError(409, 'Task quota reached');
    }

    if (task.proof_type === 'url' && !input.proofUrl) throw new HttpError(400, 'Proof URL required');
    if (task.proof_type === 'text' && !input.proofText) throw new HttpError(400, 'Proof text required');
    if (task.proof_type === 'file') {
      if (!input.proofFileUrl) throw new HttpError(400, 'Proof file required');
      if (!env.STORAGE_PUBLIC_BASE_URL) throw new HttpError(503, 'Proof file storage is not configured');
      const expectedPrefix = env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '') + '/proofs/' + req.auth!.userId.toString() + '/';
      if (!input.proofFileUrl.startsWith(expectedPrefix)) {
        throw new HttpError(400, 'Proof file must come from platform storage');
      }
    }

    if (!task.is_repeatable) {
      const prior = await client.query(
        `SELECT id,status FROM task_submissions
         WHERE task_id=$1 AND user_id=$2 AND status IN ('pending','in_review','approved')
         LIMIT 1`,
        [task.id, req.auth!.userId.toString()]
      );
      if (prior.rows[0]) throw new HttpError(409, 'Task already submitted');
    }

    const r = await client.query(
      `INSERT INTO task_submissions(task_id,user_id,proof_url,proof_text,proof_file_url,status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       RETURNING *`,
      [task.id, req.auth!.userId.toString(), input.proofUrl || null, input.proofText || null, input.proofFileUrl || null]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       VALUES ($1,'task','Task submitted','Your proof was submitted and is waiting for review.')`,
      [req.auth!.userId.toString()]
    );

    return r.rows[0];
  });

  res.status(201).json(submission);
});

router.get('/submissions/me', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query(
    `SELECT s.*,t.title,t.reward_points,t.category
     FROM task_submissions s
     JOIN tasks t ON t.id=s.task_id
     WHERE s.user_id=$1
     ORDER BY s.submitted_at DESC`,
    [req.auth!.userId.toString()]
  );
  res.json(r.rows);
});

export default router;
