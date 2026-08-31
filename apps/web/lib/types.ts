export type Me = {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  status?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  country_code?: string | null;
  bio?: string | null;
  referral_code?: string;
  level?: number;
  rank?: string;
  is_premium?: boolean;
  premium_expires_at?: string | null;
  available_points?: string | number;
  held_points?: string | number;
  lifetime_earned_points?: string | number;
};

export type Dashboard = {
  wallet: {
    available_points: string | number;
    held_points: string | number;
    lifetime_earned_points: string | number;
  };
  earnings: {
    today: string | number;
    week: string | number;
    month: string | number;
  };
  referrals: number;
  recentActivity: Array<{
    id: string;
    event_type: string;
    reward_points: string | number;
    status: string;
    created_at: string;
  }>;
};

export type Offer = {
  id: string | number;
  external_id?: string | null;
  title: string;
  description: string;
  category: string;
  reward_points: string | number;
  image_url?: string | null;
  difficulty?: string | null;
  estimated_minutes?: number | null;
  requirements?: unknown[];
  is_featured?: boolean;
  provider_slug?: string | null;
  provider_name?: string | null;
};

export type Task = {
  id: string | number;
  title: string;
  description: string;
  category: string;
  reward_points: string | number;
  proof_type: 'url'|'text'|'file'|'none';
  instructions?: unknown[];
  max_completions?: number | null;
  completions_count?: number;
  already_submitted?: boolean;
  expires_at?: string | null;
};

export type WithdrawalMethod = {
  id: string | number;
  method_key: string;
  label: string;
  account_details: Record<string, unknown>;
  is_default: boolean;
};

export type Withdrawal = {
  id: string | number;
  method_key: string;
  points: string | number;
  status: string;
  requested_at: string;
  rejection_reason?: string | null;
};

export type ReferralSummary = {
  referralCode: string | null;
  totalReferrals: number;
  totalCommissionPoints: string;
  referrals: Array<{ id:string; username:string; created_at:string }>;
  commissions: Array<{
    id:string;
    commission_points:string|number;
    status:string;
    referred_username:string;
    created_at:string;
  }>;
};

export type PayoutCatalogMethod = {
  id:string|number;
  method_key:string;
  name:string;
  mode:'manual'|'api';
  instructions:string;
  account_fields:Array<{key:string;label:string;type?:string;required?:boolean}>;
  min_points:string|number;
  fee_bps:number;
  sort_order:number;
};
