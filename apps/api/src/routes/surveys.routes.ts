import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';

const router = Router();

const profileSchema = z.object({
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() - 13).optional(),
  gender: z.string().trim().max(50).optional(),
  postalCode: z.string().trim().max(20).optional(),
  countryCode: z.string().trim().max(3).optional(),
  answers: z.record(z.unknown()).default({})
});

router.get('/profile', requireAuth, async (req: AuthedRequest, res) => {
  const r = await pool.query('SELECT * FROM survey_profiles WHERE user_id=$1', [req.auth!.userId.toString()]);
  res.json(r.rows[0] || null);
});

router.put('/profile', requireAuth, async (req: AuthedRequest, res) => {
  const input = profileSchema.parse(req.body);
  const r = await pool.query(
    `INSERT INTO survey_profiles(user_id,birth_year,gender,postal_code,country_code,answers)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET
       birth_year=EXCLUDED.birth_year,
       gender=EXCLUDED.gender,
       postal_code=EXCLUDED.postal_code,
       country_code=EXCLUDED.country_code,
       answers=EXCLUDED.answers,
       updated_at=NOW()
     RETURNING *`,
    [
      req.auth!.userId.toString(),
      input.birthYear || null,
      input.gender || null,
      input.postalCode || null,
      input.countryCode || null,
      JSON.stringify(input.answers)
    ]
  );
  res.json(r.rows[0]);
});

router.get('/providers', requireAuth, async (_req, res) => {
  const r = await pool.query(
    `SELECT id,slug,name,wall_url,public_config
     FROM providers WHERE kind='survey' AND is_enabled=TRUE ORDER BY name`
  );
  res.json(r.rows);
});

export default router;
