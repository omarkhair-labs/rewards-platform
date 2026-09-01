import crypto from 'node:crypto';
import type pg from 'pg';
import { env } from './config/env.js';
import { hashPassword } from './auth.js';
import { pool, tx } from './db.js';
import { Rewards } from './rewards.js';
import { Wallet } from './wallet.js';

async function ensureUser(
  client: pg.PoolClient,
  input: { username: string; email: string; referralCode: string; password: string; referredBy?: bigint }
) {
  const existing = await client.query(
    'SELECT id FROM users WHERE email=$1 OR username=$2',
    [input.email, input.username]
  );
  if (existing.rows[0]) return BigInt(existing.rows[0].id);

  const passwordHash = await hashPassword(input.password);
  const created = await client.query(
    `INSERT INTO users(username,email,password_hash,referral_code,referred_by,email_verified_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     RETURNING id`,
    [
      input.username,
      input.email,
      passwordHash,
      input.referralCode,
      input.referredBy?.toString() || null
    ]
  );
  await client.query('INSERT INTO wallet_accounts(user_id) VALUES ($1)', [created.rows[0].id]);
  return BigInt(created.rows[0].id);
}

async function run() {
  if (!env.DEMO_SEED_ENABLED) {
    throw new Error('Refusing to seed demo data unless DEMO_SEED_ENABLED=true');
  }
  if (!env.DEMO_USER_PASSWORD) {
    throw new Error('DEMO_USER_PASSWORD is required when demo seeding is enabled');
  }

  const password = env.DEMO_USER_PASSWORD;
  const demoUserId = await tx(async client => {
    const ownerId = await ensureUser(client, {
      username: 'demo',
      email: 'demo@example.test',
      referralCode: 'DEMOOWNER',
      password
    });
    const friendId = await ensureUser(client, {
      username: 'demo-friend',
      email: 'demo-friend@example.test',
      referralCode: 'DEMOFRIEND',
      password,
      referredBy: ownerId
    });

    await client.query(
      `UPDATE users
       SET full_name='Demo Member',country_code='EG',
           bio='Preview account with seeded rewards, tasks, referrals and cashout states.',
           is_premium=TRUE,premium_expires_at=NOW()+INTERVAL '90 days',updated_at=NOW()
       WHERE id=$1`,
      [ownerId.toString()]
    );
    await client.query(
      'UPDATE users SET referred_by=COALESCE(referred_by,$1),updated_at=NOW() WHERE id=$2',
      [ownerId.toString(), friendId.toString()]
    );

    const provider = await client.query(
      `INSERT INTO providers(slug,name,kind,wall_url,signature_mode,is_enabled,public_config,secret_config)
       VALUES ('demo-preview','Preview Partner','offerwall','https://example.com/rewards-demo','hmac_sha256',FALSE,'{}','{}')
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,updated_at=NOW()
       RETURNING id`
    );
    const providerId = BigInt(provider.rows[0].id);

    const offers = [
      ['demo-wordplay','Wordplay Quest','Reach level 10 in the puzzle game.','Games',1200,true,'Easy',12],
      ['demo-grandwin','Grandwin Signup','Create an account and complete the onboarding checklist.','Signups',2750,true,'Easy',8],
      ['demo-wallet','Crypto Wallet Setup','Install the app and finish the guided wallet setup.','Apps',4600,true,'Medium',18],
      ['demo-play','Play & Earn Challenge','Complete the first three game milestones.','Games',1750,true,'Medium',20],
      ['demo-reward-zone','Reward Zone Survey','Answer a short consumer preference survey.','Surveys',950,false,'Easy',6],
      ['demo-battle','World of Battle','Install and complete the tutorial mission.','Games',3400,false,'Medium',25],
      ['demo-movie','Movie Club Trial','Join the preview club and verify registration.','Videos',800,false,'Easy',5],
      ['demo-daily-app','Daily App Check-in','Install and complete the first daily check-in.','Apps',1100,false,'Easy',7]
    ] as const;

    for (const [externalId,title,description,category,reward,featured,difficulty,minutes] of offers) {
      await client.query(
        `INSERT INTO offers
         (external_id,provider_id,title,description,category,reward_points,landing_url,difficulty,estimated_minutes,is_featured,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)
         ON CONFLICT (provider_id,external_id) DO UPDATE SET
           title=EXCLUDED.title,description=EXCLUDED.description,category=EXCLUDED.category,
           reward_points=EXCLUDED.reward_points,landing_url=EXCLUDED.landing_url,
           difficulty=EXCLUDED.difficulty,estimated_minutes=EXCLUDED.estimated_minutes,
           is_featured=EXCLUDED.is_featured,is_active=TRUE,updated_at=NOW()`,
        [
          externalId,
          providerId.toString(),
          title,
          description,
          category,
          reward.toString(),
          `https://example.com/rewards-demo/${externalId}?user={user_id}&click={click_token}`,
          difficulty,
          minutes,
          featured
        ]
      );
    }

    const tasks = [
      ['Join the community channel','Join the official community channel and paste your public profile URL.','Social',500,'url',false],
      ['Follow the official account','Follow the brand account and submit your username.','Social',350,'text',true],
      ['Complete profile review','Fill in the profile fields and submit a short confirmation.','Profile',800,'text',false],
      ['Share the launch post','Share the launch post and paste the public share URL.','Social',600,'url',true]
    ] as const;

    for (const [title,description,category,reward,proofType,repeatable] of tasks) {
      const exists = await client.query('SELECT id FROM tasks WHERE title=$1 LIMIT 1', [title]);
      if (!exists.rows[0]) {
        await client.query(
          `INSERT INTO tasks(title,description,category,reward_points,proof_type,instructions,max_completions,is_repeatable,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,500,$7,TRUE)`,
          [
            title,
            description,
            category,
            reward.toString(),
            proofType,
            JSON.stringify(['Complete the requested action.','Submit clear proof for review.']),
            repeatable
          ]
        );
      }
    }

    const profileTask = await client.query(
      `SELECT id FROM tasks WHERE title='Complete profile review' LIMIT 1`
    );
    if (profileTask.rows[0]) {
      await client.query(
        `INSERT INTO task_submissions(task_id,user_id,proof_text,status)
         SELECT $1,$2,'Demo profile completed','in_review'
         WHERE NOT EXISTS (
           SELECT 1 FROM task_submissions
           WHERE task_id=$1 AND user_id=$2 AND status IN ('pending','in_review','approved')
         )`,
        [profileTask.rows[0].id, ownerId.toString()]
      );
    }

    const campaigns = [
      ['Quick Product Preview','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',15,125,2],
      ['Daily Sponsor Clip','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',20,175,1]
    ] as const;
    for (const [title,mediaUrl,duration,reward,dailyLimit] of campaigns) {
      const exists = await client.query('SELECT id FROM watch_campaigns WHERE title=$1 LIMIT 1', [title]);
      if (!exists.rows[0]) {
        await client.query(
          `INSERT INTO watch_campaigns(title,media_url,duration_seconds,reward_points,daily_limit,is_active)
           VALUES ($1,$2,$3,$4,$5,TRUE)`,
          [title,mediaUrl,duration,reward.toString(),dailyLimit]
        );
      }
    }

    await Rewards.credit(client, {
      userId: ownerId,
      providerId,
      eventType: 'offer',
      externalTransactionId: 'demo-credit-offer-001',
      rewardPoints: 5000n,
      idempotencyKey: 'demo:reward:offer:001',
      rawPayload: { seeded: true }
    });
    await Rewards.credit(client, {
      userId: ownerId,
      eventType: 'survey',
      externalTransactionId: 'demo-credit-survey-001',
      rewardPoints: 2500n,
      idempotencyKey: 'demo:reward:survey:001',
      rawPayload: { seeded: true }
    });
    await Rewards.credit(client, {
      userId: ownerId,
      eventType: 'task',
      rewardPoints: 1600n,
      idempotencyKey: 'demo:reward:task:001',
      rawPayload: { seeded: true }
    });
    await Rewards.credit(client, {
      userId: ownerId,
      eventType: 'watch',
      rewardPoints: 800n,
      idempotencyKey: 'demo:reward:watch:001',
      rawPayload: { seeded: true }
    });
    await Rewards.credit(client, {
      userId: ownerId,
      eventType: 'manual',
      rewardPoints: 8000n,
      idempotencyKey: 'demo:reward:manual:001',
      rawPayload: { seeded: true, reason: 'demo opening balance' }
    });
    await Rewards.credit(client, {
      userId: friendId,
      eventType: 'offer',
      rewardPoints: 1000n,
      idempotencyKey: 'demo:reward:friend:001',
      rawPayload: { seeded: true }
    });

    let method = await client.query(
      `SELECT id FROM withdrawal_methods
       WHERE user_id=$1 AND method_key='instapay'
       ORDER BY id ASC LIMIT 1`,
      [ownerId.toString()]
    );
    if (!method.rows[0]) {
      method = await client.query(
        `INSERT INTO withdrawal_methods(user_id,method_key,label,account_details,is_default)
         VALUES ($1,'instapay','Demo InstaPay',$2,TRUE)
         RETURNING id`,
        [ownerId.toString(), JSON.stringify({ account: 'demo@instapay' })]
      );
    }

    await Wallet.hold(client, {
      userId: ownerId,
      points: 5000n,
      sourceType: 'withdrawal',
      sourceId: 'demo-withdrawal-001',
      idempotencyKey: 'demo:withdrawal:hold:001',
      metadata: { seeded: true }
    });
    const catalogMethod = await client.query(
      `SELECT id,fee_bps FROM payout_method_catalog
       WHERE method_key='instapay' AND is_enabled=TRUE
       LIMIT 1`
    );
    const feeBps = Number(catalogMethod.rows[0]?.fee_bps || 0);
    const feePoints = (5000n * BigInt(feeBps)) / 10000n;
    const netPoints = 5000n - feePoints;

    await client.query(
      `INSERT INTO withdrawals
       (user_id,method_id,method_key,account_snapshot,points,payout_method_catalog_id,fee_bps,fee_points,net_points,status,idempotency_key)
       VALUES ($1,$2,'instapay',$3,5000,$4,$5,$6,$7,'in_review','demo:withdrawal:request:001')
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        ownerId.toString(),
        method.rows[0].id,
        JSON.stringify({ account: 'demo@instapay' }),
        catalogMethod.rows[0]?.id || null,
        feeBps,
        feePoints.toString(),
        netPoints.toString()
      ]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message)
       SELECT $1,'info','Demo environment ready','This account contains seeded preview data for product review.'
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
         WHERE user_id=$1 AND title='Demo environment ready'
       )`,
      [ownerId.toString()]
    );

    return ownerId;
  });

  console.log(`demo seed ready: demo@example.test (user id ${demoUserId.toString()})`);
  console.log('demo password was read from DEMO_USER_PASSWORD and was not written to the database in plaintext');
}

run()
  .then(async () => pool.end())
  .catch(async error => {
    console.error(error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
