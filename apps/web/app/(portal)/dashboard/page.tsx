'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Dashboard, Offer } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

export default function DashboardPage(){
  const [data,setData]=useState<Dashboard|null>(null);
  const [offers,setOffers]=useState<Offer[]>([]);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setError('');
    try{
      const [dashboard,featured]=await Promise.all([
        apiFetch<Dashboard>('/api/account/dashboard'),
        apiFetch<Offer[]>('/api/providers/offers?featured=true')
      ]);
      setData(dashboard);
      setOffers(featured.slice(0,4));
    }catch(err){
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  },[]);

  useEffect(()=>{void load();},[load]);

  if(error&&!data) return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!data) return <LoadingPanel label="Loading dashboard..." />;

  return <>
    <section className="hero-title">
      <h1>Your Rewards Dashboard</h1>
      <p>Complete offers, surveys and tasks to grow your balance.</p>
    </section>

    <div className="notice">Your account is active. Keep your profile and withdrawal details current before requesting a cashout.</div>

    <div className="stats-grid mt">
      <div className="stat-card"><span>Available Balance</span><strong>{formatPoints(data.wallet.available_points)} Coins</strong><em>{formatPoints(data.wallet.held_points)} held{Number(data.wallet.debt_points||0)>0?' · '+formatPoints(data.wallet.debt_points)+' debt':''}</em></div>
      <div className="stat-card"><span>Today</span><strong>{formatPoints(data.earnings.today)}</strong><em>Coins earned</em></div>
      <div className="stat-card"><span>This Week</span><strong>{formatPoints(data.earnings.week)}</strong><em>{formatPoints(data.earnings.month)} this month</em></div>
      <div className="stat-card"><span>Referrals</span><strong>{data.referrals}</strong><em>Invited members</em></div>
    </div>

    <div className="section-heading"><h2>Featured opportunities</h2><span>{offers.length} highlighted</span></div>
    {offers.length ? <div className="offer-grid">
      {offers.map((offer)=><div className="offer-card featured" key={offer.id}>
        <span className="offer-badge">FEATURED</span>
        <div className="offer-art">{offer.title.slice(0,1).toUpperCase()}</div>
        <h3>{offer.title}</h3>
        <p>{offer.provider_name || offer.provider_slug || 'Rewards'} · {offer.category}</p>
        <div className="offer-footer"><span className="reward">{formatPoints(offer.reward_points)} Coins</span><a className="primary-button" href="/offers">View offer</a></div>
      </div>)}
    </div> : <div className="panel center muted" style={{padding:28,fontSize:8}}>Featured provider offers will appear here when a provider is enabled.</div>}

    <div className="section-heading"><h2>Recent activity</h2><span>Latest credited events</span></div>
    <div className="panel">
      <table className="table">
        <thead><tr><th>Type</th><th>Reward</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {data.recentActivity.length ? data.recentActivity.map(row=><tr key={row.id}>
            <td>{row.event_type}</td>
            <td><span className="reward">{formatPoints(row.reward_points)} Coins</span></td>
            <td><span className={'status-pill '+(row.status==='credited'?'available':'review')}>{row.status}</span></td>
            <td>{new Date(row.created_at).toLocaleDateString()}</td>
          </tr>) : <tr><td colSpan={4} className="center muted" style={{padding:26}}>No activity yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
