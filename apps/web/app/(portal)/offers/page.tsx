'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Offer } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

export default function OffersPage(){
  const [offers,setOffers]=useState<Offer[]>([]);
  const [selected,setSelected]=useState<Offer|null>(null);
  const [category,setCategory]=useState('All');
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [starting,setStarting]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{
      setOffers(await apiFetch<Offer[]>('/api/providers/offers'));
    }catch(err){
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    }
  },[]);

  useEffect(()=>{void load();},[load]);

  const categories=useMemo(()=>['All',...Array.from(new Set(offers.map(o=>o.category))).sort()], [offers]);
  const filtered=useMemo(()=>offers.filter(o=>{
    const cat=category==='All'||o.category===category;
    const q=search.trim().toLowerCase();
    const text=!q||`${o.title} ${o.description} ${o.provider_name||''}`.toLowerCase().includes(q);
    return cat&&text;
  }),[offers,category,search]);

  async function startOffer(){
    if(!selected)return;
    setStarting(true);
    setError('');
    try{
      const result=await apiFetch<{url:string;clickToken:string}>(`/api/providers/offers/${selected.id}/click`,{method:'POST'});
      window.open(result.url,'_blank','noopener,noreferrer');
    }catch(err){
      setError(err instanceof Error ? err.message : 'Unable to start offer');
    }finally{setStarting(false);}
  }

  if(error&&!offers.length)return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!offers.length&&!error)return <LoadingPanel label="Loading live offers..." />;

  return <>
    <section className="hero-title">
      <h1>Live Earning Opportunities</h1>
      <p>Browse provider offers, compare rewards and start an eligible opportunity.</p>
    </section>

    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="toolbar">
      <div className="filters">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={'filter '+(category===c?'active':'')}>{c}</button>)}</div>
      <input className="search" placeholder="Search offers..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>

    <div className="section-heading"><h2>Offers</h2><span>{filtered.length} available</span></div>
    {filtered.length?<div className="offer-grid">
      {filtered.map(o=><div className={'offer-card '+(o.is_featured?'featured':'')} key={o.id}>
        {o.is_featured&&<span className="offer-badge">FEATURED</span>}
        <div className="offer-art">{o.title.slice(0,1).toUpperCase()}</div>
        <h3>{o.title}</h3>
        <p>{o.provider_name||o.provider_slug||'Provider'} · {o.category}</p>
        <div className="offer-footer"><span className="reward">{formatPoints(o.reward_points)} Coins</span><button className="primary-button" onClick={()=>setSelected(o)}>View</button></div>
      </div>)}
    </div>:<div className="panel center muted" style={{padding:32,fontSize:8}}>No offers match this filter.</div>}

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="offer-art">{selected.title.slice(0,1).toUpperCase()}</div>
        <h2>{selected.title}</h2>
        <div className="stats-grid">
          <div className="stat-card"><span>Reward</span><strong>{formatPoints(selected.reward_points)}</strong><em>Coins</em></div>
          <div className="stat-card"><span>Provider</span><strong>{selected.provider_name||selected.provider_slug||'Provider'}</strong><em>External partner</em></div>
          <div className="stat-card"><span>Difficulty</span><strong>{selected.difficulty||'Standard'}</strong><em>{selected.estimated_minutes?selected.estimated_minutes+' min':'Time varies'}</em></div>
          <div className="stat-card"><span>Category</span><strong>{selected.category}</strong><em>Eligibility applies</em></div>
        </div>
        <div className="panel mt"><b style={{fontSize:9}}>Requirements</b><p className="muted" style={{fontSize:8}}>{selected.description||'Follow the provider instructions and complete the offer in the same session.'}</p></div>
        <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button><button disabled={starting} className="primary-button" onClick={()=>void startOffer()}>{starting?'Opening...':'Start Offer'}</button></div>
      </div>
    </div>}
  </>;
}
