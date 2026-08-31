export type AdminDashboard = {
  users:number;
  taskQueue:number;
  withdrawalQueue:number;
  creditedRewardPoints:string|number;
  fraudEvents24h:number;
};

export type AdminUser = {
  id:string;
  username:string;
  email:string;
  role:'user'|'moderator'|'admin';
  status:'active'|'suspended'|'banned';
  level:number;
  rank:string;
  is_premium:boolean;
  premium_expires_at?:string|null;
  withdrawal_locked_at?:string|null;
  withdrawal_lock_reason?:string|null;
  created_at:string;
  available_points:string|number;
  held_points:string|number;
  lifetime_earned_points:string|number;
};

export type AdminOffer = {
  id:string;
  provider_id?:string|null;
  provider_slug?:string|null;
  provider_name?:string|null;
  external_id?:string|null;
  title:string;
  description:string;
  category:string;
  reward_points:string|number;
  image_url?:string|null;
  landing_url?:string|null;
  difficulty?:string|null;
  estimated_minutes?:number|null;
  allowed_countries?:string[];
  requirements?:unknown[];
  is_featured:boolean;
  is_active:boolean;
  created_at:string;
};

export type AdminTask = {
  id:string;
  title:string;
  description:string;
  category:string;
  reward_points:string|number;
  proof_type:'url'|'text'|'file'|'none';
  max_completions?:number|null;
  completions_count:number;
  is_repeatable:boolean;
  is_active:boolean;
  expires_at?:string|null;
  created_at:string;
};

export type TaskSubmission = {
  id:string;
  task_id:string;
  user_id:string;
  username:string;
  email:string;
  task_title:string;
  reward_points:string|number;
  proof_url?:string|null;
  proof_text?:string|null;
  proof_file_url?:string|null;
  status:'pending'|'in_review'|'approved'|'rejected';
  review_note?:string|null;
  submitted_at:string;
  reviewed_at?:string|null;
};

export type AdminWithdrawal = {
  id:string;
  user_id:string;
  username:string;
  email:string;
  method_key:string;
  account_snapshot:Record<string,unknown>;
  points:string|number;
  status:'pending'|'in_review'|'processing'|'paid'|'rejected'|'cancelled'|'failed';
  provider_reference?:string|null;
  rejection_reason?:string|null;
  requested_at:string;
  processed_at?:string|null;
};

export type AdminProvider = {
  id:string;
  slug:string;
  name:string;
  kind:'offerwall'|'survey'|'payout';
  wall_url?:string|null;
  api_base_url?:string|null;
  public_config:Record<string,unknown>;
  signature_mode:string;
  is_enabled:boolean;
  created_at:string;
  updated_at:string;
};

export type FraudEvent = {
  id:string;
  user_id?:string|null;
  username?:string|null;
  email?:string|null;
  event_type:string;
  severity:'low'|'medium'|'high'|'critical';
  ip_address?:string|null;
  user_agent?:string|null;
  metadata:Record<string,unknown>;
  created_at:string;
};

export type AuditLog = {
  id:string;
  actor_user_id?:string|null;
  actor_username?:string|null;
  action:string;
  entity_type:string;
  entity_id?:string|null;
  metadata:Record<string,unknown>;
  created_at:string;
};

export type LevelRule = {
  level:number;
  rank:string;
  min_lifetime_points:string|number;
  created_at:string;
};

export type WatchCampaign = {
  id:string;
  title:string;
  media_url:string;
  duration_seconds:number;
  reward_points:string|number;
  daily_limit:number;
  is_active:boolean;
  created_at:string;
};

export type AdminPayoutMethod = {
  id:string;
  method_key:string;
  name:string;
  mode:'manual'|'api';
  provider_id?:string|null;
  provider_slug?:string|null;
  provider_name?:string|null;
  instructions:string;
  account_fields:Array<Record<string,unknown>>;
  min_points:string|number;
  fee_bps:number;
  is_enabled:boolean;
  sort_order:number;
  created_at:string;
  updated_at:string;
};
