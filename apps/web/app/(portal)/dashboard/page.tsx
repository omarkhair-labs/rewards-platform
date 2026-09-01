'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CircleDollarSign, ListTodo, Play, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Dashboard, Me, Offer } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';
import { OfferTile } from '@/components/OfferTile';

export default function DashboardPage(){
  const [data,setData]=useState<Dashboard|null>(null);
  const [me,setMe]=useState<Me|null>(null);
  const [offers,setOffers]=useState<Offer[]>([]);
  const [error,setError]=useState('');
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    setRefreshing(true);
    try{
      const [dashboard,featured,user]=await Promise.all([
        apiFetch<Dashboard>('/api/account/dashboard'),
        apiFetch<Offer[]>('/api/providers/offers?featured=true'),
        apiFetch<Me>('/api/auth/me')
      ]);
      setData(dashboard);
      setOffers(featured.slice(0,8));
      setMe(user);
    }catch(err){
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }finally{
      setRefreshing(false);
    }
  },[]);

  useEffect(()=>{void load();},[load]);

  if(error&&!data) return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!data) return <LoadingPanel label="Loading dashboard..." />;

  return <>
    <section className="hero-title">
      <h1>Welcome back, {me?.username || 'Member'}!</h1>
      <div className="hero-meta">
        <span className="hero-chip">📍 {me?.country_code || 'Global member'}</span>
        <span className="live-dot">Secure rewards session</span>
      </div>
    </section>

    {error&&<div className="notice">{error}</div>}
    {Number(data.wallet.debt_points||0)>0&&<div className="notice" style={{borderColor:'rgba(255,190,70,.4)',color:'#ffd47a'}}>Cashout is locked until {formatPoints(data.wallet.debt_points)} Coins of reversed-reward debt are settled by future earnings.</div>}

    <section className="dashboard-feature">
      <div className="section-heading">
        <h2><Sparkles size={24}/> Featured Offers</h2>
        <button className="primary-button" disabled={refreshing} onClick={()=>void load()}><RefreshCw size={16}/>{refreshing?'Refreshing':'Refresh Offers'}</button>
      </div>
      {offers.length
        ? <div className="offer-grid mobile-peek">{offers.slice(0,4).map(offer=><OfferTile key={offer.id} offer={offer} featured href="/offers" actionLabel="Open Wall"/>)}</div>
        : <div className="panel empty-state"><b>No featured offers right now</b><span>Enabled provider opportunities will appear here automatically.</span></div>}
    </section>

    <div className="section-heading"><h2><Play size={24}/> Watch & Earn Videos</h2><span>Timed reward campaigns</span></div>
    <div className="watch-callout">
      <div className="watch-callout-copy"><span className="watch-icon"><Play size={22}/></span><div><b>New videos may be waiting</b><p className="muted" style={{margin:'4px 0 0',fontSize:12}}>Open a campaign, complete the timer and claim the verified reward.</p></div></div>
      <Link className="primary-button" href="/watch">New Videos <ArrowRight size={15}/></Link>
    </div>

    <div className="section-heading"><h2>Premium Opportunity Walls</h2><span>Live provider inventory</span></div>
    {offers.length
      ? <div className="offer-grid">{offers.map(offer=><OfferTile key={offer.id} offer={offer} href="/offers" actionLabel="Open Wall"/>)}</div>
      : <div className="panel empty-state"><b>Provider walls are being prepared</b><span>Your account will show eligible opportunities as soon as a provider is enabled.</span></div>}

    <div className="section-heading"><h2>Account Overview</h2><span>Live rewards data</span></div>
    <div className="quick-grid">
      <Link href="/offers" className="quick-card"><Sparkles size={27}/><b>Best Picks</b><span>Curated earning opportunities</span><em>{offers.length} featured offers</em></Link>
      <Link href="/tasks" className="quick-card"><ListTodo size={27}/><b>Complete Tasks</b><span>Submit proof and track review</span><em>{formatPoints(data.earnings.week)} earned this week</em></Link>
      <Link href="/profile" className="quick-card"><UserRound size={27}/><b>My Profile</b><span>Stats, level and account settings</span><em>{data.referrals} referrals</em></Link>
      <Link href="/cashout" className="quick-card"><CircleDollarSign size={27}/><b>Cashout</b><span>Withdraw available rewards</span><em>{formatPoints(data.wallet.available_points)} Coins available{Number(data.wallet.debt_points||0)>0?' · '+formatPoints(data.wallet.debt_points)+' debt':''}</em></Link>
    </div>

    <div className="section-heading"><h2>Recent Activity</h2><span>Latest credited events</span></div>
    <div className="panel table-wrap">
      <table className="table">
        <thead><tr><th>Type</th><th>Reward</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{data.recentActivity.length ? data.recentActivity.map(row=><tr key={row.id}>
          <td>{row.event_type}</td>
          <td><span className="reward">{formatPoints(row.reward_points)} Coins</span></td>
          <td><span className={'status-pill '+(row.status==='credited'?'available':'review')}>{row.status}</span></td>
          <td>{new Date(row.created_at).toLocaleDateString()}</td>
        </tr>) : <tr><td colSpan={4} className="center muted" style={{padding:28}}>No activity yet.</td></tr>}</tbody>
      </table>
    </div>
  </>;
}
