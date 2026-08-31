'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Dashboard, Me, Withdrawal } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

type WalletEntry={
  id:string;
  direction:string;
  points:string|number;
  source_type:string;
  created_at:string;
  available_after:string|number;
};

export default function ProfilePage(){
  const [me,setMe]=useState<Me|null>(null);
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [transactions,setTransactions]=useState<WalletEntry[]>([]);
  const [withdrawals,setWithdrawals]=useState<Withdrawal[]>([]);
  const [tab,setTab]=useState<'earnings'|'withdrawals'>('earnings');
  const [editing,setEditing]=useState(false);
  const [fullName,setFullName]=useState('');
  const [countryCode,setCountryCode]=useState('');
  const [bio,setBio]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{
      const [user,d,tx,w]=await Promise.all([
        apiFetch<Me>('/api/auth/me'),
        apiFetch<Dashboard>('/api/account/dashboard'),
        apiFetch<WalletEntry[]>('/api/account/transactions'),
        apiFetch<Withdrawal[]>('/api/withdrawals')
      ]);
      setMe(user);setDashboard(d);setTransactions(tx);setWithdrawals(w);
      setFullName(user.full_name||'');
      setCountryCode(user.country_code||'');
      setBio(user.bio||'');
    }catch(err){setError(err instanceof Error?err.message:'Failed to load profile');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    try{
      await apiFetch('/api/account/profile',{
        method:'PATCH',
        body:JSON.stringify({
          fullName:fullName||undefined,
          countryCode:countryCode||undefined,
          bio:bio||undefined
        })
      });
      setEditing(false);
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to update profile');}
    finally{setSaving(false);}
  }

  const securityScore=useMemo(()=>{
    if(!me)return 0;
    let score=30;
    if(me.full_name)score+=15;
    if(me.country_code)score+=10;
    if(me.bio)score+=5;
    if(me.email)score+=20;
    if((me.available_points??0)!==undefined)score+=10;
    return Math.min(score,100);
  },[me]);

  if(loading)return <LoadingPanel label="Loading profile..." />;
  if(error&&!me)return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!me||!dashboard)return null;

  const username=me.username||'Member';
  const initial=username.slice(0,1).toUpperCase();

  return <>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="panel">
      <div className="profile-head">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-meta">
          <h1>{me.full_name||username}</h1>
          <p>@{username} · {me.country_code||'Country not set'}</p>
          <div className="level-row"><span className="level-badge">{(me.rank||'Bronze').toUpperCase()}</span><span className="level-badge" style={{background:'#57e6a1'}}>LEVEL {me.level||1}</span>{me.is_premium&&<span className="level-badge" style={{background:'#d98cff'}}>PREMIUM</span>}</div>
        </div>
        <div style={{marginLeft:'auto'}}><button className="primary-button" onClick={()=>setEditing(true)}>Edit profile</button></div>
      </div>
    </div>

    <div className="stats-grid mt">
      <div className="stat-card"><span>Earnings Overview</span><strong>{formatPoints(dashboard.wallet.lifetime_earned_points)} Coins</strong><em>Lifetime earnings</em></div>
      <div className="stat-card"><span>Activity Stats</span><strong>{dashboard.recentActivity.length}</strong><em>Recent reward events</em></div>
      <div className="stat-card"><span>Referral Program</span><strong>{dashboard.referrals}</strong><em>Invited members</em></div>
      <div className="stat-card"><span>Security Score</span><div className="progress-ring" style={{marginTop:7,background:'conic-gradient(#65e59a 0 '+securityScore+'%,#2b294a '+securityScore+'% 100%)'}}><b>{securityScore}</b></div></div>
    </div>

    <div className="panel mt">
      <div className="section-heading"><h2>Earning Breakdown</h2><span>Live wallet data</span></div>
      <div className="stats-grid">
        <div className="stat-card"><span>Today</span><strong>{formatPoints(dashboard.earnings.today)}</strong></div>
        <div className="stat-card"><span>This Week</span><strong>{formatPoints(dashboard.earnings.week)}</strong></div>
        <div className="stat-card"><span>This Month</span><strong>{formatPoints(dashboard.earnings.month)}</strong></div>
        <div className="stat-card"><span>Available</span><strong>{formatPoints(dashboard.wallet.available_points)}</strong></div>
      </div>
    </div>

    <div className="panel mt">
      <div className="filters"><button className={'filter '+(tab==='earnings'?'active':'')} onClick={()=>setTab('earnings')}>Earnings</button><button className={'filter '+(tab==='withdrawals'?'active':'')} onClick={()=>setTab('withdrawals')}>Withdrawals</button></div>
      {tab==='earnings'?<table className="table">
        <thead><tr><th>Source</th><th>Direction</th><th>Points</th><th>Balance after</th><th>Date</th></tr></thead>
        <tbody>{transactions.length?transactions.map(row=><tr key={row.id}><td>{row.source_type}</td><td>{row.direction}</td><td>{formatPoints(row.points)}</td><td>{formatPoints(row.available_after)}</td><td>{new Date(row.created_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={5} className="center muted" style={{padding:24}}>No wallet activity yet.</td></tr>}</tbody>
      </table>:<table className="table">
        <thead><tr><th>Method</th><th>Points</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{withdrawals.length?withdrawals.map(row=><tr key={row.id}><td>{row.method_key}</td><td>{formatPoints(row.points)}</td><td>{row.status}</td><td>{new Date(row.requested_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={4} className="center muted" style={{padding:24}}>No withdrawals yet.</td></tr>}</tbody>
      </table>}
    </div>

    <div className="panel mt">
      <div className="section-heading"><h2>Privacy & Security</h2><span className="status-pill available">Account protected</span></div>
      <div className="split">
        <div className="panel"><b style={{fontSize:9}}>Public identity</b><p className="muted" style={{fontSize:7}}>Username, level and public badges can be used in leaderboard/community surfaces.</p></div>
        <div className="panel"><b style={{fontSize:9}}>Cashout protection</b><p className="muted" style={{fontSize:7}}>Withdrawals reserve coins before review so the same balance cannot be spent twice.</p></div>
      </div>
    </div>

    {editing&&<div className="modal-backdrop" onClick={()=>setEditing(false)}>
      <form className="modal" onClick={e=>e.stopPropagation()} onSubmit={save}>
        <h2>Edit profile</h2>
        <div className="form-grid">
          <div className="field"><label>Full name</label><input value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={100}/></div>
          <div className="field"><label>Country code</label><input value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())} maxLength={3}/></div>
          <div className="field"><label>Bio</label><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500}/></div>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(false)}>Cancel</button><button disabled={saving} className="primary-button">{saving?'Saving...':'Save profile'}</button></div>
      </form>
    </div>}
  </>;
}
