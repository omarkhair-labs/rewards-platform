import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { pool, tx } from '../src/db.js';
import { env } from '../src/config/env.js';
import { Wallet } from '../src/wallet.js';
import { rebuildTestDatabase } from './helpers.js';

const password='Test-password-123!';

async function register(username:string,email:string){
  const response=await request(app)
    .post('/api/auth/register')
    .send({username,email,password});

  expect(response.status).toBe(201);
  return response.body as {token:string;user:{id:string;username:string;email:string;role:string}};
}

async function setRole(userId:string,role:'user'|'moderator'|'admin'){
  await pool.query('UPDATE users SET role=$1 WHERE id=$2',[role,userId]);
}

function auth(token:string){
  return {Authorization:`Bearer ${token}`};
}

function genericSignature(secret:string,transactionId:string,userId:string,reward:string,status:string){
  return crypto
    .createHmac('sha256',secret)
    .update(`${transactionId}:${userId}:${reward}:${status}`)
    .digest('hex');
}

describe('security and money invariants',()=>{
  beforeEach(async()=>{
    await rebuildTestDatabase();
  });

  afterAll(async()=>{
    await pool.end();
  });

  it('enforces JWT claims and admin-only account mutations',async()=>{
    const moderator=await register('moderator','moderator@example.com');
    const target=await register('targetuser','target@example.com');
    const admin=await register('adminuser','admin@example.com');

    await setRole(moderator.user.id,'moderator');
    await setRole(admin.user.id,'admin');

    const list=await request(app).get('/api/admin/users').set(auth(moderator.token));
    expect(list.status).toBe(200);

    const denied=await request(app)
      .patch('/api/admin/users/'+target.user.id)
      .set(auth(moderator.token))
      .send({status:'suspended'});
    expect(denied.status).toBe(403);

    const allowed=await request(app)
      .patch('/api/admin/users/'+target.user.id)
      .set(auth(admin.token))
      .send({status:'suspended'});
    expect(allowed.status).toBe(200);
    expect(allowed.body.status).toBe('suspended');

    const claimless=jwt.sign(
      {sub:admin.user.id,role:'admin'},
      env.JWT_SECRET,
      {algorithm:'HS256',expiresIn:'1h'}
    );

    const rejected=await request(app).get('/api/auth/me').set(auth(claimless));
    expect(rejected.status).toBe(401);

    const failedLogin=await request(app)
      .post('/api/auth/login')
      .send({email:'admin@example.com',password:'wrong-password'});
    expect(failedLogin.status).toBe(401);

    const fraud=await pool.query(
      `SELECT event_type,severity FROM fraud_events
       WHERE user_id=$1 AND event_type='login_failed'`,
      [admin.user.id]
    );
    expect(fraud.rowCount).toBe(1);
    expect(fraud.rows[0].severity).toBe('medium');
  });

  it('lets moderators approve proof exactly once but not create reward campaigns',async()=>{
    const admin=await register('adminuser','admin@example.com');
    const moderator=await register('moderator','moderator@example.com');
    const member=await register('memberuser','member@example.com');

    await setRole(admin.user.id,'admin');
    await setRole(moderator.user.id,'moderator');

    const moderatorCreate=await request(app)
      .post('/api/admin/tasks')
      .set(auth(moderator.token))
      .send({
        title:'Forbidden create',
        description:'moderator should not create money-bearing campaigns',
        category:'Social',
        rewardPoints:'100',
        proofType:'text',
        isActive:true
      });
    expect(moderatorCreate.status).toBe(403);

    const task=await request(app)
      .post('/api/admin/tasks')
      .set(auth(admin.token))
      .send({
        title:'Verify a social action',
        description:'Submit the requested confirmation text.',
        category:'Social',
        rewardPoints:'1000',
        proofType:'text',
        isActive:true
      });

    expect(task.status).toBe(201);

    const submission=await request(app)
      .post('/api/tasks/'+task.body.id+'/submit')
      .set(auth(member.token))
      .send({proofText:'proof-complete'});
    expect(submission.status).toBe(201);

    const approved=await request(app)
      .patch('/api/admin/task-submissions/'+submission.body.id)
      .set(auth(moderator.token))
      .send({decision:'approved',note:'verified'});
    expect(approved.status).toBe(200);

    const duplicate=await request(app)
      .patch('/api/admin/task-submissions/'+submission.body.id)
      .set(auth(moderator.token))
      .send({decision:'approved'});
    expect(duplicate.status).toBe(409);

    const wallet=await pool.query(
      'SELECT available_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0].available_points).toBe('1000');

    const audits=await pool.query(
      `SELECT action FROM audit_logs
       WHERE action IN ('task.create','task_submission.approved')
       ORDER BY action`
    );
    expect(audits.rowCount).toBe(2);
  });

  it('enforces withdrawal transitions, evidence and balance hold/release invariants',async()=>{
    const admin=await register('adminuser','admin@example.com');
    const member=await register('memberuser','member@example.com');
    await setRole(admin.user.id,'admin');

    await pool.query(
      `UPDATE wallet_accounts
       SET available_points=20000,lifetime_earned_points=20000
       WHERE user_id=$1`,
      [member.user.id]
    );

    const method=await request(app)
      .post('/api/withdrawals/methods')
      .set(auth(member.token))
      .send({
        methodKey:'instapay',
        accountDetails:{account:'member@instapay'},
        isDefault:true
      });
    expect(method.status).toBe(201);

    const requested=await request(app)
      .post('/api/withdrawals')
      .set(auth(member.token))
      .send({
        methodId:method.body.id,
        points:'10000',
        idempotencyKey:'withdrawal-test-0001'
      });
    expect(requested.status).toBe(201);

    let wallet=await pool.query(
      'SELECT available_points,held_points,debt_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0]).toMatchObject({available_points:'10000',held_points:'10000',debt_points:'0'});

    const directPaid=await request(app)
      .patch('/api/admin/withdrawals/'+requested.body.id)
      .set(auth(admin.token))
      .send({status:'paid',providerReference:'tx-direct'});
    expect(directPaid.status).toBe(409);

    expect((await request(app)
      .patch('/api/admin/withdrawals/'+requested.body.id)
      .set(auth(admin.token))
      .send({status:'in_review'})).status).toBe(200);

    expect((await request(app)
      .patch('/api/admin/withdrawals/'+requested.body.id)
      .set(auth(admin.token))
      .send({status:'processing'})).status).toBe(200);

    const noReference=await request(app)
      .patch('/api/admin/withdrawals/'+requested.body.id)
      .set(auth(admin.token))
      .send({status:'paid'});
    expect(noReference.status).toBe(400);

    const paid=await request(app)
      .patch('/api/admin/withdrawals/'+requested.body.id)
      .set(auth(admin.token))
      .send({status:'paid',providerReference:'manual:proof-001'});
    expect(paid.status).toBe(200);

    wallet=await pool.query(
      'SELECT available_points,held_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0]).toMatchObject({available_points:'10000',held_points:'0'});

    const second=await request(app)
      .post('/api/withdrawals')
      .set(auth(member.token))
      .send({
        methodId:method.body.id,
        points:'5000',
        idempotencyKey:'withdrawal-test-0002'
      });
    expect(second.status).toBe(201);

    await request(app)
      .patch('/api/admin/withdrawals/'+second.body.id)
      .set(auth(admin.token))
      .send({status:'in_review'});

    const rejectWithoutReason=await request(app)
      .patch('/api/admin/withdrawals/'+second.body.id)
      .set(auth(admin.token))
      .send({status:'rejected'});
    expect(rejectWithoutReason.status).toBe(400);

    const rejected=await request(app)
      .patch('/api/admin/withdrawals/'+second.body.id)
      .set(auth(admin.token))
      .send({status:'rejected',reason:'account details could not be verified'});
    expect(rejected.status).toBe(200);

    wallet=await pool.query(
      'SELECT available_points,held_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0]).toMatchObject({available_points:'10000',held_points:'0'});
  });

  it('binds generic provider signatures to status, de-duplicates credits and creates debt on spent chargebacks',async()=>{
    const member=await register('memberuser','member@example.com');
    const secret='provider-secret-with-enough-entropy';
    await pool.query(
      `INSERT INTO providers(slug,name,kind,signature_mode,is_enabled,secret_config)
       VALUES ('testwall','Test Wall','offerwall','hmac_sha256',TRUE,$1)`,
      [JSON.stringify({postbackSecret:secret})]
    );

    const txId='provider-tx-001';
    const reward='500';
    const completedSignature=genericSignature(secret,txId,member.user.id,reward,'completed');

    const first=await request(app)
      .post('/api/providers/testwall/postback')
      .send({
        transactionId:txId,
        userId:member.user.id,
        rewardPoints:reward,
        status:'completed',
        signature:completedSignature
      });
    expect(first.status).toBe(200);

    const duplicate=await request(app)
      .post('/api/providers/testwall/postback')
      .send({
        transactionId:txId,
        userId:member.user.id,
        rewardPoints:reward,
        status:'completed',
        signature:completedSignature
      });
    expect(duplicate.status).toBe(200);

    let wallet=await pool.query(
      'SELECT available_points,debt_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0]).toMatchObject({available_points:'500',debt_points:'0'});

    const tampered=await request(app)
      .post('/api/providers/testwall/postback')
      .send({
        transactionId:txId,
        userId:member.user.id,
        rewardPoints:reward,
        status:'reversed',
        signature:completedSignature
      });
    expect(tampered.status).toBe(403);

    await tx(client=>Wallet.debit(client,{
      userId:BigInt(member.user.id),
      points:500n,
      sourceType:'test_spend',
      sourceId:'spent-before-chargeback',
      idempotencyKey:'test:spend:1'
    }));

    const reversalSignature=genericSignature(secret,txId,member.user.id,reward,'reversed');
    const reversed=await request(app)
      .post('/api/providers/testwall/postback')
      .send({
        transactionId:txId,
        userId:member.user.id,
        rewardPoints:reward,
        status:'reversed',
        signature:reversalSignature
      });
    expect(reversed.status).toBe(200);

    wallet=await pool.query(
      'SELECT available_points,debt_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0]).toMatchObject({available_points:'0',debt_points:'500'});

    const locked=await pool.query(
      'SELECT withdrawal_locked_at,withdrawal_lock_reason FROM users WHERE id=$1',
      [member.user.id]
    );
    expect(locked.rows[0].withdrawal_locked_at).not.toBeNull();
    expect(locked.rows[0].withdrawal_lock_reason).toBe('Outstanding reward debt');

    await tx(client=>Wallet.credit(client,{
      userId:BigInt(member.user.id),
      points:500n,
      sourceType:'test_credit',
      sourceId:'debt-settlement',
      idempotencyKey:'test:credit:1'
    }));

    wallet=await pool.query(
      'SELECT available_points,debt_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0]).toMatchObject({available_points:'0',debt_points:'0'});

    const unlocked=await pool.query(
      'SELECT withdrawal_locked_at FROM users WHERE id=$1',
      [member.user.id]
    );
    expect(unlocked.rows[0].withdrawal_locked_at).toBeNull();
  });

  it('serializes concurrent watch completions so the daily limit cannot double-credit',async()=>{
    const member=await register('memberuser','member@example.com');

    const campaign=await pool.query(
      `INSERT INTO watch_campaigns(title,media_url,duration_seconds,reward_points,daily_limit,is_active)
       VALUES ('Short campaign','https://example.com/video',5,100,1,TRUE)
       RETURNING id`
    );

    const firstId=crypto.randomUUID();
    const secondId=crypto.randomUUID();

    await pool.query(
      `INSERT INTO watch_sessions(id,campaign_id,user_id,started_at)
       VALUES ($1,$3,$4,NOW()-INTERVAL '10 seconds'),
              ($2,$3,$4,NOW()-INTERVAL '10 seconds')`,
      [firstId,secondId,campaign.rows[0].id,member.user.id]
    );

    const results=await Promise.all([
      request(app).post('/api/watch/sessions/'+firstId+'/complete').set(auth(member.token)),
      request(app).post('/api/watch/sessions/'+secondId+'/complete').set(auth(member.token))
    ]);

    expect(results.map(r=>r.status).sort()).toEqual([200,409]);

    const wallet=await pool.query(
      'SELECT available_points FROM wallet_accounts WHERE user_id=$1',
      [member.user.id]
    );
    expect(wallet.rows[0].available_points).toBe('100');

    const credited=await pool.query(
      `SELECT COUNT(*)::int count FROM watch_sessions
       WHERE campaign_id=$1 AND user_id=$2 AND credited_at IS NOT NULL`,
      [campaign.rows[0].id,member.user.id]
    );
    expect(credited.rows[0].count).toBe(1);
  });

  it('rejects unsafe configurable outbound URLs',async()=>{
    const admin=await register('adminuser','admin@example.com');
    await setRole(admin.user.id,'admin');

    const response=await request(app)
      .post('/api/admin/offers')
      .set(auth(admin.token))
      .send({
        title:'Unsafe offer',
        description:'Should be rejected',
        category:'General',
        rewardPoints:'100',
        landingUrl:'javascript:alert(1)',
        isActive:true
      });

    expect(response.status).toBe(400);
  });
});
