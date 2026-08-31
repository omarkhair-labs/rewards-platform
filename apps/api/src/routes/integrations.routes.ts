import crypto from 'crypto';
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { HttpError } from '../http.js';

const router = Router();

async function enabledProvider(slug: string) {
  const r = await pool.query(
    'SELECT * FROM providers WHERE slug=$1 AND is_enabled=TRUE',
    [slug]
  );
  if (!r.rows[0]) throw new HttpError(503, `${slug} is not enabled`);
  return r.rows[0];
}

function base64Url(input: Buffer) {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .replace(/\n/g, '');
}

router.get('/theoremreach/entry', requireAuth, async (req: AuthedRequest, res) => {
  const p = await enabledProvider('theoremreach');
  const publicConfig = p.public_config || {};
  const secretConfig = p.secret_config || {};

  const apiKey = String(secretConfig.apiKey || publicConfig.apiKey || '');
  const secretKey = String(secretConfig.secretKey || '');
  const partnerId = String(publicConfig.partnerId || '');
  const exchangeRate = Number(publicConfig.exchangeRate || 1000);
  const plural = String(publicConfig.currencyNamePlural || 'Coins');
  const singular = String(publicConfig.currencyNameSingular || 'Coin');

  if (!apiKey || !secretKey || !partnerId) {
    throw new HttpError(503, 'TheoremReach credentials are incomplete');
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate < 10) {
    throw new HttpError(503, 'TheoremReach exchange rate must be at least 10');
  }

  const userId = req.auth!.userId.toString();
  const transactionId = crypto.randomUUID();
  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('user_id', userId);
  params.set('transaction_id', transactionId);
  params.set('currency_name_plural', plural);
  params.set('currency_name_singular', singular);
  params.set('exchange_rate', String(exchangeRate));
  params.set('external_id', userId);
  params.set('partner_id', partnerId);

  const urlBeforeHash = `https://theoremreach.com/respondent_entry/direct?${params.toString()}`;
  const hash = base64Url(crypto.createHmac('sha1', secretKey).update(urlBeforeHash).digest());
  const url = `${urlBeforeHash}&hash=${encodeURIComponent(hash)}`;

  await pool.query(
    `INSERT INTO provider_sessions(id,provider_id,user_id,external_transaction_id,kind,metadata)
     VALUES ($1,$2,$3,$4,'survey',$5)`,
    [
      crypto.randomUUID(),
      p.id,
      userId,
      transactionId,
      JSON.stringify({ partnerId, exchangeRate, currencyNamePlural: plural })
    ]
  );

  res.json({ url, transactionId });
});

router.get('/cpx/wall', requireAuth, async (req: AuthedRequest, res) => {
  const p = await enabledProvider('cpx');
  const publicConfig = p.public_config || {};
  const secretConfig = p.secret_config || {};

  const appId = String(publicConfig.appId || '');
  const secureHashSecret = String(secretConfig.secureHash || '');
  if (!appId) throw new HttpError(503, 'CPX app ID is not configured');

  const userId = req.auth!.userId.toString();
  const [userResult, profileResult] = await Promise.all([
    pool.query(
      'SELECT username,email,country_code FROM users WHERE id=$1',
      [userId]
    ),
    pool.query(
      'SELECT * FROM survey_profiles WHERE user_id=$1',
      [userId]
    )
  ]);

  const user = userResult.rows[0];
  if (!user) throw new HttpError(404, 'User not found');
  const profile = profileResult.rows[0];

  const params = new URLSearchParams();
  params.set('app_id', appId);
  params.set('ext_user_id', userId);
  if (secureHashSecret) {
    params.set(
      'secure_hash',
      crypto.createHash('md5').update(`${userId}-${secureHashSecret}`).digest('hex')
    );
  }
  if (user.username) params.set('username', String(user.username));
  if (user.email) params.set('email', String(user.email));

  if (profile) {
    params.set('main_info', 'true');
    if (profile.birth_year) params.set('birthday_year', String(profile.birth_year));
    if (profile.gender) {
      const value = String(profile.gender).toLowerCase();
      if (value.startsWith('m')) params.set('gender', 'm');
      else if (value.startsWith('f')) params.set('gender', 'f');
    }
    const country = profile.country_code || user.country_code;
    if (country) params.set('user_country_code', String(country).toUpperCase());
    if (profile.postal_code) params.set('zip_code', String(profile.postal_code));
  }

  res.json({
    url: `https://offers.cpx-research.com/index.php?${params.toString()}`
  });
});

router.get('/cpx/surveys', requireAuth, async (req: AuthedRequest, res) => {
  const p = await enabledProvider('cpx');
  const publicConfig = p.public_config || {};
  const secretConfig = p.secret_config || {};
  const appId = String(publicConfig.appId || '');
  const secureHashSecret = String(secretConfig.secureHash || '');

  if (!appId) throw new HttpError(503, 'CPX app ID is not configured');

  const userId = req.auth!.userId.toString();
  const [userResult, profileResult] = await Promise.all([
    pool.query('SELECT username,email,country_code FROM users WHERE id=$1', [userId]),
    pool.query('SELECT * FROM survey_profiles WHERE user_id=$1', [userId])
  ]);

  const user = userResult.rows[0];
  if (!user) throw new HttpError(404, 'User not found');
  const profile = profileResult.rows[0];

  const params = new URLSearchParams();
  params.set('app_id', appId);
  params.set('ext_user_id', userId);
  params.set('output_method', 'api');
  params.set('ip_user', req.ip || '127.0.0.1');
  params.set('limit', String(Math.min(Math.max(Number(req.query.limit || 12), 1), 50)));
  if (req.headers['user-agent']) params.set('user_agent', String(req.headers['user-agent']));
  if (user.email) params.set('email', String(user.email));
  if (secureHashSecret) {
    params.set(
      'secure_hash',
      crypto.createHash('md5').update(`${userId}-${secureHashSecret}`).digest('hex')
    );
  }

  if (profile) {
    params.set('main_info', 'true');
    if (profile.birth_year) params.set('birthday_year', String(profile.birth_year));
    if (profile.gender) {
      const value = String(profile.gender).toLowerCase();
      if (value.startsWith('m')) params.set('gender', 'm');
      else if (value.startsWith('f')) params.set('gender', 'f');
    }
    const country = profile.country_code || user.country_code;
    if (country) params.set('user_country_code', String(country).toUpperCase());
    if (profile.postal_code) params.set('zip_code', String(profile.postal_code));
  }

  const response = await fetch(
    `https://live-api.cpx-research.com/api/get-surveys.php?${params.toString()}`,
    {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    }
  );

  if (!response.ok) {
    throw new HttpError(502, 'CPX survey API is unavailable');
  }

  const payload = await response.json();
  res.json(payload);
});

export default router;
