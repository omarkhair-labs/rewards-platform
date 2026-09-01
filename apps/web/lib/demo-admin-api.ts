import type {
  AdminDashboard, AdminOffer, AdminPayoutMethod, AdminProvider, AdminTask,
  AdminUser, AdminWithdrawal, AuditLog, FraudEvent, LevelRule,
  TaskSubmission, WatchCampaign
} from './admin-types';

const now = Date.now();
const iso = (daysAgo = 0) => new Date(now - daysAgo * 86_400_000).toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

let users: AdminUser[] = [
  {id:'admin-1',username:'demo.admin',email:'admin@rewards.local',role:'admin',status:'active',level:6,rank:'Diamond',is_premium:true,premium_expires_at:null,created_at:iso(160),available_points:125000,held_points:0,debt_points:0,lifetime_earned_points:640000},
  {id:'user-1',username:'demo.member',email:'demo@rewards.local',role:'user',status:'active',level:2,rank:'Bronze',is_premium:true,premium_expires_at:null,created_at:iso(72),available_points:4280,held_points:0,debt_points:0,lifetime_earned_points:18750},
  {id:'user-2',username:'lina.earns',email:'lina@example.com',role:'user',status:'active',level:4,rank:'Gold',is_premium:false,created_at:iso(45),available_points:14820,held_points:3000,debt_points:0,lifetime_earned_points:96500},
  {id:'user-3',username:'samir.tasks',email:'samir@example.com',role:'user',status:'suspended',level:1,rank:'Starter',is_premium:false,created_at:iso(18),available_points:930,held_points:0,debt_points:1200,lifetime_earned_points:4600},
  {id:'mod-1',username:'review.team',email:'moderator@rewards.local',role:'moderator',status:'active',level:1,rank:'Starter',is_premium:false,created_at:iso(120),available_points:0,held_points:0,debt_points:0,lifetime_earned_points:0}
];

let providers: AdminProvider[] = [
  {id:'provider-1',slug:'lootably',name:'Rewardly',kind:'offerwall',wall_url:'https://offers.example.com',api_base_url:'https://api.example.com',public_config:{placement:'main-wall'},signature_mode:'hmac_sha256',is_enabled:true,created_at:iso(90),updated_at:iso(2)},
  {id:'provider-2',slug:'cpx',name:'CPX Research',kind:'survey',wall_url:'https://surveys.example.com',public_config:{theme:'dark'},signature_mode:'hmac_sha256',is_enabled:true,created_at:iso(75),updated_at:iso(4)},
  {id:'provider-3',slug:'airtm-payouts',name:'Airtm Payouts',kind:'payout',api_base_url:'https://payouts.example.com',public_config:{currency:'USD'},signature_mode:'bearer',is_enabled:false,created_at:iso(40),updated_at:iso(6)}
];

let offers: AdminOffer[] = [
  {id:'offer-1',provider_id:'provider-1',provider_slug:'lootably',provider_name:'Rewardly',external_id:'RW-1042',title:'Wordplay Adventure',description:'Install and complete the starter journey.',category:'Apps',reward_points:1750,landing_url:'https://example.com/wordplay',difficulty:'Easy',estimated_minutes:5,is_featured:true,is_active:true,created_at:iso(20)},
  {id:'offer-2',provider_id:'provider-1',provider_slug:'lootably',provider_name:'Rewardly',external_id:'RW-1128',title:'Grand Win',description:'Create an account and finish onboarding.',category:'Signups',reward_points:27930,landing_url:'https://example.com/grand-win',difficulty:'Easy',estimated_minutes:5,is_featured:true,is_active:true,created_at:iso(12)},
  {id:'offer-3',provider_id:null,provider_name:null,external_id:null,title:'Community Bonus',description:'Complete the internal community campaign.',category:'Community',reward_points:900,difficulty:'Easy',estimated_minutes:3,is_featured:false,is_active:false,created_at:iso(5)}
];

let tasks: AdminTask[] = [
  {id:'task-1',title:'Join the community channel',description:'Join and submit your public profile link.',category:'Social',reward_points:500,proof_type:'url',max_completions:500,completions_count:124,is_repeatable:false,is_active:true,created_at:iso(30)},
  {id:'task-2',title:'Create a product walkthrough',description:'Publish a walkthrough and provide its URL.',category:'Creative',reward_points:5000,proof_type:'url',max_completions:100,completions_count:18,is_repeatable:false,is_active:true,created_at:iso(14)},
  {id:'task-3',title:'Share the rewards launch',description:'Share the approved launch post.',category:'Social',reward_points:600,proof_type:'file',max_completions:300,completions_count:72,is_repeatable:true,is_active:true,created_at:iso(7)}
];

let submissions: TaskSubmission[] = [
  {id:'submission-1',task_id:'task-1',user_id:'user-2',username:'lina.earns',email:'lina@example.com',task_title:'Join the community channel',reward_points:500,proof_url:'https://example.com/lina-proof',status:'pending',submitted_at:iso(0)},
  {id:'submission-2',task_id:'task-3',user_id:'user-1',username:'demo.member',email:'demo@rewards.local',task_title:'Share the rewards launch',reward_points:600,proof_file_url:'https://demo.local/proof.png',status:'in_review',review_note:'Checking public visibility.',submitted_at:iso(1)},
  {id:'submission-3',task_id:'task-2',user_id:'user-3',username:'samir.tasks',email:'samir@example.com',task_title:'Create a product walkthrough',reward_points:5000,proof_url:'https://example.com/video',status:'approved',review_note:'Clear walkthrough.',submitted_at:iso(8),reviewed_at:iso(7)}
];

let withdrawals: AdminWithdrawal[] = [
  {id:'withdrawal-1',user_id:'user-2',username:'lina.earns',email:'lina@example.com',method_key:'mobile-wallet',account_snapshot:{phone:'+20 100 000 0000'},points:3000,fee_bps:0,fee_points:0,net_points:3000,status:'pending',requested_at:iso(0)},
  {id:'withdrawal-2',user_id:'user-1',username:'demo.member',email:'demo@rewards.local',method_key:'airtm',account_snapshot:{email:'demo@rewards.local'},points:2500,fee_bps:0,fee_points:0,net_points:2500,status:'paid',provider_reference:'DEMO-PAY-2048',requested_at:iso(18),processed_at:iso(17)},
  {id:'withdrawal-3',user_id:'user-3',username:'samir.tasks',email:'samir@example.com',method_key:'binance',account_snapshot:{payId:'884201'},points:5000,fee_bps:100,fee_points:50,net_points:4950,status:'rejected',rejection_reason:'Account ownership could not be verified.',requested_at:iso(5),processed_at:iso(4)}
];

let payoutMethods: AdminPayoutMethod[] = [
  {id:'payout-1',method_key:'airtm',name:'Airtm',mode:'manual',instructions:'Enter the Airtm account email.',account_fields:[{key:'email',label:'Airtm email',type:'email',required:true}],min_points:2500,fee_bps:0,is_enabled:true,sort_order:10,created_at:iso(80),updated_at:iso(3)},
  {id:'payout-2',method_key:'binance',name:'Binance Pay',mode:'manual',instructions:'Enter the Binance Pay ID.',account_fields:[{key:'payId',label:'Binance Pay ID',type:'text',required:true}],min_points:5000,fee_bps:100,is_enabled:true,sort_order:20,created_at:iso(70),updated_at:iso(4)},
  {id:'payout-3',method_key:'airtm-api',name:'Airtm Automated',mode:'api',provider_id:'provider-3',provider_slug:'airtm-payouts',provider_name:'Airtm Payouts',instructions:'Automated payout after review.',account_fields:[{key:'email',label:'Account email',type:'email',required:true}],min_points:5000,fee_bps:0,is_enabled:false,sort_order:30,created_at:iso(30),updated_at:iso(6)}
];

let watchCampaigns: WatchCampaign[] = [
  {id:'watch-1',title:'Product discovery video',media_url:'https://example.com/video/discovery',duration_seconds:30,reward_points:40,daily_limit:5,is_active:true,created_at:iso(16)},
  {id:'watch-2',title:'Community spotlight',media_url:'https://example.com/video/community',duration_seconds:45,reward_points:65,daily_limit:3,is_active:true,created_at:iso(9)}
];

const fraudEvents: FraudEvent[] = [
  {id:'fraud-1',user_id:'user-3',username:'samir.tasks',email:'samir@example.com',event_type:'withdrawal_blocked_by_debt',severity:'high',ip_address:'196.219.24.18',user_agent:'Chrome on Android',metadata:{debtPoints:1200,requestedPoints:5000},created_at:iso(0)},
  {id:'fraud-2',user_id:'user-2',username:'lina.earns',email:'lina@example.com',event_type:'repeated_login_failure',severity:'medium',ip_address:'41.33.91.10',user_agent:'Chrome on Windows',metadata:{attempts:6,windowMinutes:15},created_at:iso(1)}
];

let auditLogs: AuditLog[] = [
  {id:'audit-1',actor_user_id:'admin-1',actor_username:'demo.admin',action:'withdrawal.mark_paid',entity_type:'withdrawal',entity_id:'withdrawal-2',metadata:{providerReference:'DEMO-PAY-2048'},created_at:iso(17)},
  {id:'audit-2',actor_user_id:'mod-1',actor_username:'review.team',action:'task_submission.approve',entity_type:'task_submission',entity_id:'submission-3',metadata:{rewardPoints:5000},created_at:iso(7)}
];

const levelRules: LevelRule[] = [
  {level:1,rank:'Starter',min_lifetime_points:0,created_at:iso(180)},
  {level:2,rank:'Bronze',min_lifetime_points:10000,created_at:iso(180)},
  {level:3,rank:'Silver',min_lifetime_points:25000,created_at:iso(180)},
  {level:4,rank:'Gold',min_lifetime_points:75000,created_at:iso(180)},
  {level:5,rank:'Platinum',min_lifetime_points:200000,created_at:iso(180)},
  {level:6,rank:'Diamond',min_lifetime_points:500000,created_at:iso(180)}
];

function bodyOf(options: RequestInit) {
  if (typeof options.body !== 'string') return {} as Record<string, unknown>;
  try { return JSON.parse(options.body) as Record<string, unknown>; } catch { return {}; }
}

function log(action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  auditLogs = [{id:id('audit'),actor_user_id:'admin-1',actor_username:'demo.admin',action,entity_type:entityType,entity_id:entityId,metadata,created_at:new Date().toISOString()}, ...auditLogs];
}

function providerFields(providerId: unknown) {
  const provider=providers.find(x=>x.id===String(providerId||''));
  return {provider_id:provider?.id||null,provider_slug:provider?.slug||null,provider_name:provider?.name||null};
}

export async function demoAdminApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(path, 'https://demo.local');
  const clean = url.pathname;
  const body = bodyOf(options);

  if (clean === '/api/admin/dashboard') return {users:users.length,taskQueue:submissions.filter(x=>x.status==='pending').length,withdrawalQueue:withdrawals.filter(x=>['pending','in_review','processing'].includes(x.status)).length,creditedRewardPoints:83250,fraudEvents24h:fraudEvents.length} satisfies AdminDashboard as T;
  if (clean === '/api/admin/users' && method === 'GET') {const q=(url.searchParams.get('q')||'').toLowerCase();return users.filter(x=>!q||x.username.toLowerCase().includes(q)||x.email.toLowerCase().includes(q)) as T;}
  if (/^\/api\/admin\/users\/[^/]+$/.test(clean) && method === 'PATCH') {const userId=clean.split('/').pop()!;users=users.map(user=>user.id!==userId?user:{...user,status:(body.status as AdminUser['status'])??user.status,role:(body.role as AdminUser['role'])??user.role,is_premium:'isPremium' in body?Boolean(body.isPremium):user.is_premium,premium_expires_at:'premiumExpiresAt' in body?(body.premiumExpiresAt as string|null):user.premium_expires_at,withdrawal_locked_at:'withdrawalLocked' in body?(body.withdrawalLocked?new Date().toISOString():null):user.withdrawal_locked_at,withdrawal_lock_reason:'withdrawalLockReason' in body?String(body.withdrawalLockReason||''):user.withdrawal_lock_reason});log('user.update','user',userId,body);return users.find(x=>x.id===userId) as T;}

  if (clean === '/api/admin/offers' && method === 'GET') return offers as T;
  if (clean === '/api/admin/offers' && method === 'POST') {const offer:AdminOffer={id:id('offer'),title:String(body.title),description:String(body.description||''),category:String(body.category||'General'),reward_points:String(body.rewardPoints||0),...providerFields(body.providerId),landing_url:body.landingUrl?String(body.landingUrl):null,difficulty:body.difficulty?String(body.difficulty):null,estimated_minutes:body.estimatedMinutes?Number(body.estimatedMinutes):null,is_featured:Boolean(body.isFeatured),is_active:Boolean(body.isActive),created_at:new Date().toISOString()};offers=[offer,...offers];log('offer.create','offer',offer.id);return offer as T;}
  if (/^\/api\/admin\/offers\/[^/]+$/.test(clean) && method === 'PATCH') {const offerId=clean.split('/').pop()!;offers=offers.map(x=>x.id!==offerId?x:{...x,title:'title' in body?String(body.title):x.title,description:'description' in body?String(body.description):x.description,category:'category' in body?String(body.category):x.category,reward_points:'rewardPoints' in body?String(body.rewardPoints):x.reward_points,...('providerId' in body?providerFields(body.providerId):{}),landing_url:'landingUrl' in body?(body.landingUrl?String(body.landingUrl):null):x.landing_url,difficulty:'difficulty' in body?String(body.difficulty||''):x.difficulty,estimated_minutes:'estimatedMinutes' in body?(body.estimatedMinutes?Number(body.estimatedMinutes):null):x.estimated_minutes,is_featured:'isFeatured' in body?Boolean(body.isFeatured):x.is_featured,is_active:'isActive' in body?Boolean(body.isActive):x.is_active});log('offer.update','offer',offerId,body);return offers.find(x=>x.id===offerId) as T;}

  if (clean === '/api/admin/tasks' && method === 'GET') return tasks as T;
  if (clean === '/api/admin/tasks' && method === 'POST') {const task:AdminTask={id:id('task'),title:String(body.title),description:String(body.description||''),category:String(body.category||'General'),reward_points:String(body.rewardPoints||0),proof_type:(body.proofType as AdminTask['proof_type'])||'none',max_completions:body.maxCompletions?Number(body.maxCompletions):null,completions_count:0,is_repeatable:Boolean(body.isRepeatable),is_active:Boolean(body.isActive),created_at:new Date().toISOString()};tasks=[task,...tasks];log('task.create','task',task.id);return task as T;}
  if (/^\/api\/admin\/tasks\/[^/]+$/.test(clean) && method === 'PATCH') {const taskId=clean.split('/').pop()!;tasks=tasks.map(x=>x.id!==taskId?x:{...x,title:'title' in body?String(body.title):x.title,description:'description' in body?String(body.description):x.description,category:'category' in body?String(body.category):x.category,reward_points:'rewardPoints' in body?String(body.rewardPoints):x.reward_points,proof_type:'proofType' in body?(body.proofType as AdminTask['proof_type']):x.proof_type,max_completions:'maxCompletions' in body?(body.maxCompletions?Number(body.maxCompletions):null):x.max_completions,is_repeatable:'isRepeatable' in body?Boolean(body.isRepeatable):x.is_repeatable,is_active:'isActive' in body?Boolean(body.isActive):x.is_active});log('task.update','task',taskId,body);return tasks.find(x=>x.id===taskId) as T;}

  if (clean === '/api/admin/task-submissions' && method === 'GET') {const status=url.searchParams.get('status');return submissions.filter(x=>!status||x.status===status) as T;}
  if (/^\/api\/admin\/task-submissions\/[^/]+$/.test(clean) && method === 'PATCH') {const submissionId=clean.split('/').pop()!;submissions=submissions.map(x=>x.id!==submissionId?x:{...x,status:body.decision as TaskSubmission['status'],review_note:body.note?String(body.note):x.review_note,reviewed_at:new Date().toISOString()});log(`task_submission.${String(body.decision)}`,'task_submission',submissionId);return submissions.find(x=>x.id===submissionId) as T;}
  if (clean === '/api/admin/withdrawals' && method === 'GET') {const status=url.searchParams.get('status');return withdrawals.filter(x=>!status||x.status===status) as T;}
  if (/^\/api\/admin\/withdrawals\/[^/]+$/.test(clean) && method === 'PATCH') {const withdrawalId=clean.split('/').pop()!;withdrawals=withdrawals.map(x=>x.id!==withdrawalId?x:{...x,status:body.status as AdminWithdrawal['status'],provider_reference:body.providerReference?String(body.providerReference):x.provider_reference,rejection_reason:body.reason?String(body.reason):x.rejection_reason,processed_at:['paid','rejected','failed'].includes(String(body.status))?new Date().toISOString():x.processed_at});log(`withdrawal.${String(body.status)}`,'withdrawal',withdrawalId);return withdrawals.find(x=>x.id===withdrawalId) as T;}

  if (clean === '/api/admin/providers' && method === 'GET') return providers as T;
  if (clean === '/api/admin/providers' && method === 'POST') {const provider:AdminProvider={id:id('provider'),slug:String(body.slug),name:String(body.name),kind:body.kind as AdminProvider['kind'],wall_url:body.wallUrl?String(body.wallUrl):null,api_base_url:body.apiBaseUrl?String(body.apiBaseUrl):null,public_config:(body.publicConfig||{}) as Record<string,unknown>,signature_mode:String(body.signatureMode||'hmac_sha256'),is_enabled:Boolean(body.isEnabled),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};providers=[provider,...providers];log('provider.create','provider',provider.id);return provider as T;}
  if (/^\/api\/admin\/providers\/[^/]+$/.test(clean) && method === 'PATCH') {const providerId=clean.split('/').pop()!;providers=providers.map(x=>x.id!==providerId?x:{...x,name:'name' in body?String(body.name):x.name,slug:'slug' in body?String(body.slug):x.slug,kind:'kind' in body?(body.kind as AdminProvider['kind']):x.kind,wall_url:'wallUrl' in body?String(body.wallUrl||''):x.wall_url,api_base_url:'apiBaseUrl' in body?String(body.apiBaseUrl||''):x.api_base_url,public_config:'publicConfig' in body?(body.publicConfig as Record<string,unknown>):x.public_config,signature_mode:'signatureMode' in body?String(body.signatureMode):x.signature_mode,is_enabled:'isEnabled' in body?Boolean(body.isEnabled):x.is_enabled,updated_at:new Date().toISOString()});log('provider.update','provider',providerId);return providers.find(x=>x.id===providerId) as T;}

  if (clean === '/api/admin/payout-methods' && method === 'GET') return payoutMethods as T;
  if (clean === '/api/admin/payout-methods' && method === 'POST') {const row:AdminPayoutMethod={id:id('payout'),method_key:String(body.methodKey),name:String(body.name),mode:body.mode as AdminPayoutMethod['mode'],...providerFields(body.providerId),instructions:String(body.instructions||''),account_fields:(body.accountFields||[]) as Array<Record<string,unknown>>,min_points:String(body.minPoints||0),fee_bps:Number(body.feeBps||0),is_enabled:Boolean(body.isEnabled),sort_order:Number(body.sortOrder||0),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};payoutMethods=[row,...payoutMethods];log('payout_method.create','payout_method',row.id);return row as T;}
  if (/^\/api\/admin\/payout-methods\/[^/]+$/.test(clean) && method === 'PATCH') {const payoutId=clean.split('/').pop()!;payoutMethods=payoutMethods.map(x=>x.id!==payoutId?x:{...x,method_key:'methodKey' in body?String(body.methodKey):x.method_key,name:'name' in body?String(body.name):x.name,mode:'mode' in body?(body.mode as AdminPayoutMethod['mode']):x.mode,...('providerId' in body?providerFields(body.providerId):{}),instructions:'instructions' in body?String(body.instructions):x.instructions,account_fields:'accountFields' in body?(body.accountFields as Array<Record<string,unknown>>):x.account_fields,min_points:'minPoints' in body?String(body.minPoints):x.min_points,fee_bps:'feeBps' in body?Number(body.feeBps):x.fee_bps,is_enabled:'isEnabled' in body?Boolean(body.isEnabled):x.is_enabled,sort_order:'sortOrder' in body?Number(body.sortOrder):x.sort_order,updated_at:new Date().toISOString()});log('payout_method.update','payout_method',payoutId);return payoutMethods.find(x=>x.id===payoutId) as T;}

  if (clean === '/api/admin/watch-campaigns' && method === 'GET') return watchCampaigns as T;
  if (clean === '/api/admin/watch-campaigns' && method === 'POST') {const row:WatchCampaign={id:id('watch'),title:String(body.title),media_url:String(body.mediaUrl),duration_seconds:Number(body.durationSeconds),reward_points:String(body.rewardPoints||0),daily_limit:Number(body.dailyLimit||1),is_active:Boolean(body.isActive),created_at:new Date().toISOString()};watchCampaigns=[row,...watchCampaigns];log('watch_campaign.create','watch_campaign',row.id);return row as T;}
  if (/^\/api\/admin\/watch-campaigns\/[^/]+$/.test(clean) && method === 'PATCH') {const watchId=clean.split('/').pop()!;watchCampaigns=watchCampaigns.map(x=>x.id!==watchId?x:{...x,title:'title' in body?String(body.title):x.title,media_url:'mediaUrl' in body?String(body.mediaUrl):x.media_url,duration_seconds:'durationSeconds' in body?Number(body.durationSeconds):x.duration_seconds,reward_points:'rewardPoints' in body?String(body.rewardPoints):x.reward_points,daily_limit:'dailyLimit' in body?Number(body.dailyLimit):x.daily_limit,is_active:'isActive' in body?Boolean(body.isActive):x.is_active});log('watch_campaign.update','watch_campaign',watchId);return watchCampaigns.find(x=>x.id===watchId) as T;}
  if (clean === '/api/admin/fraud-events') return fraudEvents as T;
  if (clean === '/api/admin/audit-logs') return auditLogs as T;
  if (clean === '/api/admin/level-rules') return levelRules as T;
  throw new Error(`Demo admin endpoint is not implemented: ${method} ${clean}`);
}
