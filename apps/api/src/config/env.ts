import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  APP_ORIGIN: z.string().url(),
  PUBLIC_API_URL: z.string().url().optional(),
  MIN_WITHDRAWAL_POINTS: z.coerce.bigint().default(5000n),
  REFERRAL_COMMISSION_BPS: z.coerce.number().int().min(0).max(10000).default(1000)
});

export const env = schema.parse(process.env);
