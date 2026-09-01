import type {
  Dashboard,
  Me,
  Notification,
  Offer,
  PayoutCatalogMethod,
  ReferralSummary,
  Task,
  TaskSubmission,
  Withdrawal,
  WithdrawalMethod
} from './types';

const now = Date.now();
const iso = (daysAgo = 0) => new Date(now - daysAgo * 86_400_000).toISOString();

let demoUser: Me = {
  id: 'demo-user', username: 'demo.member', email: 'demo@rewards.local', role: 'user', status: 'active',
  full_name: 'Demo Member', country_code: 'EG', bio: 'Rewards explorer', referral_code: 'DEMO2026',
  level: 2, rank: 'Bronze', is_premium: true, available_points: 4280, held_points: 0,
  debt_points: 0, lifetime_earned_points: 18750
};

const demoAdmin: Me = {
  id:'admin-1',username:'demo.admin',email:'admin@rewards.local',role:'admin',status:'active',
  full_name:'Demo Administrator',country_code:'EG',bio:'Operations console reviewer',referral_code:'ADMIN2026',
  level:6,rank:'Diamond',is_premium:true,available_points:125000,held_points:0,debt_points:0,lifetime_earned_points:640000
};

function currentDemoUser() {
  if (typeof window !== 'undefined' && window.localStorage.getItem('rewards_token') === 'demo-admin-session') return demoAdmin;
  return demoUser;
}

const offers: Offer[] = [
  {id:1,title:'Wordplay Adventure',description:'Install the game and complete the starter journey.',category:'Apps',reward_points:1750,difficulty:'Easy',estimated_minutes:5,is_featured:true,provider_slug:'lootably',provider_name:'Rewardly'},
  {id:2,title:'Grand Win',description:'Create an account and complete the required onboarding steps.',category:'Signups',reward_points:27930,difficulty:'Easy',estimated_minutes:5,is_featured:true,provider_slug:'lootably',provider_name:'Play Partners'},
  {id:3,title:'Crypto Wallet',description:'Register, verify your profile and fund the account.',category:'Apps',reward_points:1750,difficulty:'Standard',estimated_minutes:8,is_featured:true,provider_slug:'adgem',provider_name:'Rewardly'},
  {id:4,title:'Ship & Save',description:'Register and make an eligible purchase.',category:'Shopping',reward_points:1750,difficulty:'Easy',estimated_minutes:5,is_featured:true,provider_slug:'lootably',provider_name:'Rewardly'},
  {id:5,title:'Reward Zone',description:'Reach the listed points milestone.',category:'General',reward_points:1400,difficulty:'Easy',estimated_minutes:5,is_featured:true,provider_slug:'lootably',provider_name:'Offer Network'},
  {id:6,title:'World Battle',description:'Win ten battles in the mobile game.',category:'Apps',reward_points:220,difficulty:'Standard',estimated_minutes:12,provider_slug:'adgem',provider_name:'Rewardly'},
  {id:7,title:'Daily Research',description:'Complete a short consumer research session.',category:'Surveys',reward_points:850,difficulty:'Easy',estimated_minutes:7,provider_slug:'bitlabs',provider_name:'Insight Lab'},
  {id:8,title:'Movie Club',description:'Join the video community and confirm your email.',category:'Videos',reward_points:700,difficulty:'Easy',estimated_minutes:4,provider_slug:'lootably',provider_name:'Media Rewards'}
];

let tasks: Task[] = [
  {id:1,title:'Join the community channel',description:'Join our official community channel and submit your public profile link.',category:'Social',reward_points:500,proof_type:'url',max_completions:500,completions_count:124},
  {id:2,title:'Create a product walkthrough',description:'Publish an original walkthrough and provide the public video URL.',category:'Creative',reward_points:5000,proof_type:'url',max_completions:100,completions_count:18},
  {id:3,title:'Complete your member profile',description:'Add your name, country and a short profile bio.',category:'Profile',reward_points:800,proof_type:'text',max_completions:null,completions_count:88,already_submitted:true},
  {id:4,title:'Share the rewards launch',description:'Share the approved launch post and upload a clear screenshot.',category:'Social',reward_points:600,proof_type:'file',max_completions:300,completions_count:72},
  {id:5,title:'Invite an active member',description:'Invite a new member who completes their first earning event.',category:'Community',reward_points:1200,proof_type:'none',max_completions:null,completions_count:41}
];

let submissions: TaskSubmission[] = [
  {id:'s1',task_id:3,title:'Complete your member profile',category:'Profile',reward_points:800,status:'in_review',submitted_at:iso(1)},
  {id:'s2',task_id:9,title:'Follow the official updates account',category:'Social',reward_points:350,status:'approved',submitted_at:iso(7),reviewed_at:iso(6)},
  {id:'s3',task_id:10,title:'Community feedback survey',category:'Community',reward_points:450,status:'rejected',submitted_at:iso(10),reviewed_at:iso(9),review_note:'The submitted link was not publicly accessible.'}
];

let notifications: Notification[] = [
  {id:'n1',type:'reward',title:'Reward credited',message:'850 Coins were added for Daily Research.',created_at:iso(0),read_at:null},
  {id:'n2',type:'task',title:'Task under review',message:'Your profile task proof is being reviewed.',created_at:iso(1),read_at:null},
  {id:'n3',type:'system',title:'New offers available',message:'Fresh earning opportunities were added for your region.',created_at:iso(2),read_at:iso(1)}
];

let surveyProfile: {birth_year:number|null;gender:string|null;postal_code:string|null;country_code:string|null;answers:Record<string,unknown>} = {birth_year:null,gender:null,postal_code:null,country_code:'EG',answers:{}};

let methods: WithdrawalMethod[] = [];
let withdrawals: Withdrawal[] = [
  {id:'w1',method_key:'airtm',points:2500,fee_points:0,net_points:2500,status:'paid',requested_at:iso(18)}
];

const payoutCatalog: PayoutCatalogMethod[] = [
  {id:1,method_key:'airtm',name:'Airtm',mode:'manual',instructions:'Enter the Airtm account email.',account_fields:[{key:'email',label:'Airtm email',type:'email',required:true}],min_points:2500,fee_bps:0,sort_order:10},
  {id:2,method_key:'binance',name:'Binance',mode:'manual',instructions:'Enter the Binance Pay ID.',account_fields:[{key:'account',label:'Binance Pay ID',type:'text',required:true}],min_points:5000,fee_bps:0,sort_order:20},
  {id:3,method_key:'faucetpay',name:'FaucetPay',mode:'manual',instructions:'Enter the FaucetPay account email.',account_fields:[{key:'email',label:'FaucetPay email',type:'email',required:true}],min_points:1500,fee_bps:0,sort_order:30},
  {id:4,method_key:'mobile-wallet',name:'Mobile Wallet',mode:'manual',instructions:'Enter the mobile wallet phone number.',account_fields:[{key:'phone',label:'Wallet phone',type:'tel',required:true}],min_points:3000,fee_bps:0,sort_order:40}
];

const dashboard = (): Dashboard => ({
  wallet:{available_points:demoUser.available_points||0,held_points:demoUser.held_points||0,debt_points:0,lifetime_earned_points:demoUser.lifetime_earned_points||0},
  earnings:{today:350,week:1450,month:6200},referrals:7,
  recentActivity:[
    {id:'r1',event_type:'offer_reward',reward_points:850,status:'credited',created_at:iso(0)},
    {id:'r2',event_type:'task_reward',reward_points:500,status:'credited',created_at:iso(1)},
    {id:'r3',event_type:'referral_commission',reward_points:100,status:'credited',created_at:iso(2)}
  ]
});

const referrals: ReferralSummary = {
  referralCode:'DEMO2026',totalReferrals:7,totalCommissionPoints:'1260',
  referrals:[{id:'u2',username:'friend.one',created_at:iso(12)},{id:'u3',username:'friend.two',created_at:iso(5)}],
  commissions:[{id:'c1',commission_points:420,status:'credited',referred_username:'friend.one',created_at:iso(2)},{id:'c2',commission_points:840,status:'credited',referred_username:'friend.two',created_at:iso(1)}]
};

const transactions = [
  {id:'tx1',direction:'credit',points:850,source_type:'offer_reward',created_at:iso(0),available_after:4280,debt_after:0},
  {id:'tx2',direction:'credit',points:500,source_type:'task_reward',created_at:iso(1),available_after:3430,debt_after:0},
  {id:'tx3',direction:'debit',points:2500,source_type:'withdrawal',created_at:iso(18),available_after:2930,debt_after:0}
];

function bodyOf(options: RequestInit) {
  if (typeof options.body !== 'string') return {} as Record<string, unknown>;
  try { return JSON.parse(options.body) as Record<string, unknown>; } catch { return {}; }
}

export async function demoApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, 140));
  const method = (options.method || 'GET').toUpperCase();
  const clean = path.split('?')[0];
  const body = bodyOf(options);

  if (clean === '/api/auth/login') {
    const admin = String(body.email||'').toLowerCase() === 'admin@rewards.local';
    return {token:admin?'demo-admin-session':'demo-member-session',user:admin?demoAdmin:demoUser} as T;
  }
  if (clean === '/api/auth/register') return {token:'demo-member-session',user:demoUser} as T;
  if (clean === '/api/auth/me') return {...currentDemoUser()} as T;
  if (clean.startsWith('/api/admin/')) {
    if (currentDemoUser().role !== 'admin') throw new Error('Admin demo credentials are required.');
    const { demoAdminApiFetch } = await import('./demo-admin-api');
    return demoAdminApiFetch<T>(path, options);
  }
  if (clean === '/api/account/dashboard') return dashboard() as T;
  if (clean === '/api/account/transactions') return transactions as T;
  if (clean === '/api/account/level-progress') return {level:2,rank:'Bronze',lifetimePoints:18750,currentThreshold:10000,nextLevel:{level:3,rank:'Silver',min_lifetime_points:25000}} as T;
  if (clean === '/api/account/profile' && method === 'PATCH') {
    demoUser = {...demoUser,full_name:String(body.fullName||demoUser.full_name),country_code:String(body.countryCode||demoUser.country_code),bio:String(body.bio||demoUser.bio)};
    return {...demoUser} as T;
  }
  if (clean === '/api/account/notifications') return [...notifications] as T;
  if (/^\/api\/account\/notifications\/[^/]+\/read$/.test(clean) && method === 'PATCH') {
    const id = clean.split('/')[4]; notifications = notifications.map(n=>String(n.id)===id?{...n,read_at:new Date().toISOString()}:n); return undefined as T;
  }
  if (clean === '/api/providers/offers') return (path.includes('featured=true')?offers.filter(o=>o.is_featured):offers) as T;
  if (/^\/api\/providers\/offers\/[^/]+\/click$/.test(clean)) return {url:'#demo-offer',clickToken:'demo-click'} as T;
  if (clean === '/api/tasks') return tasks as T;
  if (clean === '/api/tasks/submissions/me') return submissions as T;
  if (/^\/api\/tasks\/[^/]+\/submit$/.test(clean) && method === 'POST') {
    const taskId=clean.split('/')[3]; const task=tasks.find(t=>String(t.id)===taskId);
    if(task){const submittedTask={...task,already_submitted:true};tasks=tasks.map(t=>String(t.id)===taskId?submittedTask:t);submissions=[{id:'s'+Date.now(),task_id:task.id,title:task.title,category:task.category,reward_points:task.reward_points,status:'pending',submitted_at:new Date().toISOString()},...submissions];}
    return submissions[0] as T;
  }
  if (clean === '/api/surveys/profile' && method === 'GET') return surveyProfile as T;
  if (clean === '/api/surveys/profile' && method === 'PUT') {
    surveyProfile={birth_year:body.birthYear?Number(body.birthYear):null,gender:body.gender?String(body.gender):null,postal_code:body.postalCode?String(body.postalCode):null,country_code:body.countryCode?String(body.countryCode):null,answers:(body.answers||{}) as Record<string,unknown>};
    return surveyProfile as T;
  }
  if (clean === '/api/surveys/providers') return [{id:1,slug:'cpx',name:'CPX Research'},{id:2,slug:'theoremreach',name:'TheoremReach'}] as T;
  if (clean === '/api/integrations/cpx/surveys') return {surveys:[{id:'44012',loi:7,payout:780,score:8,href:'#survey-44012',top:1},{id:'44027',loi:12,payout:1250,score:6,href:'#survey-44027'}]} as T;
  if (clean === '/api/integrations/cpx/wall' || clean === '/api/integrations/theoremreach/entry') return {url:'#survey-wall'} as T;
  if (clean === '/api/referrals') return referrals as T;
  if (clean === '/api/withdrawals/catalog') return payoutCatalog as T;
  if (clean === '/api/withdrawals/methods' && method === 'GET') return methods as T;
  if (clean === '/api/withdrawals/methods' && method === 'POST') { const item={id:'m'+Date.now(),method_key:String(body.methodKey),label:String(body.methodKey),account_details:(body.accountDetails||{}) as Record<string,unknown>,is_default:Boolean(body.isDefault)};methods=[item,...methods];return item as T; }
  if (clean === '/api/withdrawals' && method === 'GET') return withdrawals as T;
  if (clean === '/api/withdrawals' && method === 'POST') { const item={id:'w'+Date.now(),method_key:methods.find(m=>String(m.id)===String(body.methodId))?.method_key||'cashout',points:String(body.points),fee_points:0,net_points:String(body.points),status:'pending',requested_at:new Date().toISOString()};withdrawals=[item,...withdrawals];demoUser={...demoUser,available_points:Math.max(0,Number(demoUser.available_points||0)-Number(body.points||0)),held_points:Number(demoUser.held_points||0)+Number(body.points||0)};return item as T; }
  if (clean === '/api/watch') return [{id:'v1',title:'Product discovery video',media_url:'#watch-video',duration_seconds:5,reward_points:40,daily_limit:5},{id:'v2',title:'Community spotlight',media_url:'#watch-video-2',duration_seconds:8,reward_points:65,daily_limit:3}] as T;
  if (/^\/api\/watch\/[^/]+\/start$/.test(clean)) return {sessionId:'watch-'+Date.now(),minimumSeconds:5,remainingSeconds:5,resumed:false} as T;
  if (/^\/api\/watch\/sessions\/[^/]+\/complete$/.test(clean)) return {ok:true} as T;
  if (clean === '/api/uploads/proof') return {uploadUrl:'#demo-upload',publicUrl:'https://demo.local/proof.png',headers:{}} as T;

  throw new Error(`Demo endpoint is not implemented: ${method} ${clean}`);
}
