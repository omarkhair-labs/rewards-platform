'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Copy, Link2, RefreshCw, ShieldCheck, Target, UsersRound, WalletCards } from 'lucide-react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { ReferralSummary } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

const tierIcons=['🛡️','🥉','🥈','🥇','🏆','🚀','🔥','⭐','💎','👑'];

export default function AffiliatesPage(){
  const [data,setData]=useState<ReferralSummary|null>(null);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{setData(await apiFetch<ReferralSummary>('/api/referrals'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load affiliate data');}
  },[]);

  useEffect(()=>{void load();},[load]);

  const referralLink=useMemo(()=>{
    if(!data?.referralCode||typeof window==='undefined')return '';
    return window.location.origin+'/register?ref='+encodeURIComponent(data.referralCode);
  },[data]);

  async function copy(){
    if(!referralLink)return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);setTimeout(()=>setCopied(false),1400);
  }

  if(error&&!data)return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!data)return <LoadingPanel label="Loading affiliate program..." />;

  const currentTier=Math.min(10,Math.floor(data.totalReferrals/10)+1);
  const nextTarget=currentTier===10?100:currentTier*10;
  const remaining=Math.max(0,nextTarget-data.totalReferrals);

  return <>
    <section className="hero-title">
      <h1>Affiliates Program</h1>
      <p>Build your referral network, follow verified commission events and unlock milestones as your community grows.</p>
      <div className="page-actions"><Link className="primary-button" href="/dashboard"><ArrowLeft size={15}/> Back to Dashboard</Link><span className="live-dot">Live tracking active</span></div>
    </section>
    {error&&<div className="notice">{error}</div>}

    <div className="panel tier-spotlight">
      <span className="summary-icon">{tierIcons[currentTier-1]}</span>
      <strong>Tier {currentTier}</strong>
      <p>{remaining?remaining+' more referrals to the next milestone':'Highest milestone reached'}</p>
      <span className="status-pill available">Referral rewards active</span>
    </div>

    <div className="stats-grid">
      <div className="stat-card"><span className="summary-icon">👥</span><strong>{data.totalReferrals}</strong><span>Total Referrals</span></div>
      <div className="stat-card"><span className="summary-icon">💰</span><strong>{formatPoints(data.totalCommissionPoints)}</strong><span>Commission Coins</span></div>
      <div className="stat-card"><span className="summary-icon">📈</span><strong>{data.commissions.length}</strong><span>Commission Events</span></div>
      <div className="stat-card"><span className="summary-icon">🎯</span><strong>{currentTier}</strong><span>Current Tier</span></div>
    </div>

    <div className="section-heading"><h2><Link2 size={22}/> Your Referral Link</h2><span>{data.totalReferrals} successful referrals</span></div>
    <div className="panel referral-link">
      <input className="search" value={referralLink} readOnly aria-label="Referral link"/>
      <button className="primary-button" onClick={()=>void copy()}><Copy size={15}/>{copied?'Copied':'Copy Link'}</button>
    </div>

    <div className="section-heading"><h2>Tier System & Milestones</h2><span>Progress is based on verified signups</span></div>
    <div className="tier-grid">
      {Array.from({length:10},(_,index)=>{
        const tier=index+1;const target=tier*10;const unlocked=data.totalReferrals>=target||tier===currentTier;
        return <div className={'tier-card '+(tier===currentTier?'current':'')} key={tier}>
          <span className="summary-icon">{tierIcons[index]}</span><span className="tier-lock">{tier===currentTier?'CURRENT':unlocked?'REACHED':'LOCKED'}</span>
          <b>Tier {tier}</b><small>Referral milestone</small><span>👥 Refer {target} members</span><span>🎁 Platform reward tier</span>
        </div>;
      })}
    </div>

    <div className="section-heading"><h2><BarChart3 size={22}/> Recent Commission Activity</h2><button className="secondary-button" onClick={()=>void load()}><RefreshCw size={14}/> Refresh Data</button></div>
    <div className="panel table-wrap">
      <table className="table">
        <thead><tr><th>User</th><th>Commission</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{data.commissions.length?data.commissions.map(c=><tr key={c.id}><td>{c.referred_username}</td><td><span className="reward">{formatPoints(c.commission_points)} Coins</span></td><td><span className={'status-pill '+(c.status==='credited'?'available':'review')}>{c.status}</span></td><td>{new Date(c.created_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={4}><div className="empty-state"><b>No commission activity yet</b><span>Eligible referral rewards will be recorded here.</span></div></td></tr>}</tbody>
      </table>
    </div>

    <div className="task-guides mt">
      <div className="panel">
        <div className="profile-section-head"><div><h2>How It Works</h2><p>Four steps from sharing to verified commission.</p></div><ShieldCheck size={24}/></div>
        <div className="guide-list">
          <div className="guide-row"><i><Link2 size={18}/></i><div><b>Share your link</b><span>Use the unique referral URL shown above.</span></div></div>
          <div className="guide-row"><i><UsersRound size={18}/></i><div><b>They sign up</b><span>New members are linked to your referral code.</span></div></div>
          <div className="guide-row"><i><WalletCards size={18}/></i><div><b>Earn commission</b><span>Eligible reward events create traceable commission entries.</span></div></div>
          <div className="guide-row"><i><Target size={18}/></i><div><b>Reach milestones</b><span>Your tier reflects the size of your verified network.</span></div></div>
        </div>
      </div>
      <div className="panel">
        <div className="profile-section-head"><div><h2>Your Referrals</h2><p>Members who joined through your code.</p></div></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>User</th><th>Joined</th><th>Status</th></tr></thead><tbody>{data.referrals.length?data.referrals.map(ref=><tr key={ref.id}><td>{ref.username}</td><td>{new Date(ref.created_at).toLocaleDateString()}</td><td><span className="status-pill available">Joined</span></td></tr>):<tr><td colSpan={3} className="center muted" style={{padding:30}}>No referrals yet.</td></tr>}</tbody></table></div>
      </div>
    </div>
  </>;
}
