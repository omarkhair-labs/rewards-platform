import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './http.js';
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import referralsRoutes from './routes/referrals.routes.js';
import surveysRoutes from './routes/surveys.routes.js';
import withdrawalsRoutes from './routes/withdrawals.routes.js';
import providersRoutes from './routes/providers.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import officialPostbackRoutes from './routes/official-postbacks.routes.js';
import watchRoutes from './routes/watch.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';

export const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.APP_ORIGIN, credentials: true }));
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  }
}));
app.use(express.urlencoded({ extended: false }));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: req => req.path.startsWith('/api/postbacks/')
});

const postbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Postback rate limit exceeded' }
});

app.use(apiLimiter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/postbacks', postbackLimiter, officialPostbackRoutes);
app.use('/api/watch', watchRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);
