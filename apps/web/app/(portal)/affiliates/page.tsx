'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { ReferralSummary } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

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
    if(!data?.referralCode)return '';
    if(typeof window==='undefined')return '';
    return window.location.origin+'/register?ref='+encodeURIComponent(data.referralCode);
  },[data]);

  async function copy(){
    if(!referralLink)return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(()=>setCopied(false),1400);
  }

  if(error&&!data)return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!data)return <LoadingPanel label="Loading affiliate program..." />;

  return <>
    <section className="hero-title"><h1>Affiliate Program</h1><p>Invite users and receive commission automatically when eligible rewards are credited.</p></section>
    <div className="stats-grid">
      <div className="stat-card"><span>Total referrals</span><strong>{data.totalReferrals}</strong><em>Joined through your code</em></div>
      <div className="stat-card"><span>Commission earned</span><strong>{formatPoints(data.totalCommissionPoints)} Coins</strong><em>Credited commission</em></div>
      <div className="stat-card"><span>Referral code</span><strong style={{fontSize:12}}>{data.referralCode||'—'}</strong><em>Unique account code</em></div>
      <div className="stat-card"><span>Commission status</span><strong>Live</strong><em>Event-linked & reversible</em></div>
    </div>
    <div className="panel mt">
      <h2 style={{fontSize:11,marginTop:0}}>Your referral link</h2>
      <div style={{display:'flex',gap:8}}>
        <input className="search" style={{flex:1}} value={referralLink} readOnly/>
        <button className="primary-button" onClick={()=>void copy()}>{copied?'Copied':'Copy link'}</button>
      </div>
    </div>
    <div className="panel mt">
      <table className="table">
        <thead><tr><th>User</th><th>Joined</th><th>Status</th><th>Commission events</th></tr></thead>
        <tbody>{data.referrals.length?data.referrals.map(ref=>{
          const count=data.commissions.filter(c=>String(c.referred_username)===String(ref.username)).length;
          return <tr key={ref.id}><td>{ref.username}</td><td>{new Date(ref.created_at).toLocaleDateString()}</td><td><span className="status-pill available">Joined</span></td><td>{count}</td></tr>;
        }):<tr><td colSpan={4} className="center muted" style={{padding:30}}>No referrals yet.</td></tr>}</tbody>
      </table>
    </div>
    <div className="section-heading"><h2>Commission History</h2><span>{data.commissions.length} events</span></div>
    <div className="panel">
      <table className="table">
        <thead><tr><th>User</th><th>Commission</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{data.commissions.length?data.commissions.map(c=><tr key={c.id}><td>{c.referred_username}</td><td><span className="reward">{formatPoints(c.commission_points)} Coins</span></td><td>{c.status}</td><td>{new Date(c.created_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={4} className="center muted" style={{padding:24}}>No commission activity yet.</td></tr>}</tbody>
      </table>
    </div>
  </>;
}
