import 'dotenv/config';
import { z } from 'zod';

const optionalText = z.preprocess(
  value => value === '' || value === null ? undefined : value,
  z.string().min(1).optional()
);
const optionalUrl = z.preprocess(
  value => value === '' || value === null ? undefined : value,
  z.string().url().optional()
);
const optionalEmail = z.preprocess(
  value => value === '' || value === null ? undefined : value,
  z.string().email().optional()
);
const envBoolean = (defaultValue = false) => z.preprocess(value => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  return ['1','true','yes','on'].includes(String(value).trim().toLowerCase());
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('rewards-api'),
  JWT_AUDIENCE: z.string().min(1).default('rewards-web'),
  APP_ORIGIN: z.string().url(),
  PUBLIC_API_URL: optionalUrl,
  MIN_WITHDRAWAL_POINTS: z.coerce.bigint().default(5000n),
  MAX_SINGLE_REWARD_POINTS: z.coerce.bigint().positive().default(10000000n),
  REFERRAL_COMMISSION_BPS: z.coerce.number().int().min(0).max(10000).default(1000),
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_REGION: z.string().min(1).default('auto'),
  STORAGE_BUCKET: optionalText,
  STORAGE_ACCESS_KEY_ID: optionalText,
  STORAGE_SECRET_ACCESS_KEY: optionalText,
  STORAGE_PUBLIC_BASE_URL: optionalUrl,
  BOOTSTRAP_ADMIN_EMAIL: optionalEmail,
  BOOTSTRAP_ADMIN_USERNAME: z.preprocess(
    value => value === '' || value === null ? undefined : value,
    z.string().trim().min(3).max(40).optional()
  ),
  BOOTSTRAP_ADMIN_PASSWORD: z.preprocess(
    value => value === '' || value === null ? undefined : value,
    z.string().min(12).max(200).optional()
  ),
  DEMO_SEED_ENABLED: envBoolean(false),
  DEMO_USER_PASSWORD: z.preprocess(
    value => value === '' || value === null ? undefined : value,
    z.string().min(12).max(200).optional()
  )
});

export const env = schema.parse(process.env);
