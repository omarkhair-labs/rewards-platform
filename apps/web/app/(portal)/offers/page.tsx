'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, RefreshCw, Rocket, Signal, SlidersHorizontal, Star } from 'lucide-react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Offer } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';
import { OfferTile } from '@/components/OfferTile';

type SortMode='high'|'low'|'az';

export default function OffersPage(){
  const [offers,setOffers]=useState<Offer[]>([]);
  const [selected,setSelected]=useState<Offer|null>(null);
  const [category,setCategory]=useState('All');
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState<SortMode>('high');
  const [error,setError]=useState('');
  const [starting,setStarting]=useState(false);
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    setRefreshing(true);
    try{setOffers(await apiFetch<Offer[]>('/api/providers/offers'));}
    catch(err){setError(err instanceof Error ? err.message : 'Failed to load offers');}
    finally{setRefreshing(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const categories=useMemo(()=>['All',...Array.from(new Set(offers.map(o=>o.category))).sort()], [offers]);
  const filtered=useMemo(()=>{
    const rows=offers.filter(o=>{
      const cat=category==='All'||o.category===category;
      const q=search.trim().toLowerCase();
      return cat&&(!q||`${o.title} ${o.description} ${o.provider_name||''}`.toLowerCase().includes(q));
    });
    return rows.sort((a,b)=>sort==='az'?a.title.localeCompare(b.title):sort==='low'?Number(a.reward_points)-Number(b.reward_points):Number(b.reward_points)-Number(a.reward_points));
  },[offers,category,search,sort]);
  const featured=useMemo(()=>offers.filter(o=>o.is_featured).slice(0,5),[offers]);
  const totalPoints=useMemo(()=>offers.reduce((sum,o)=>sum+Number(o.reward_points||0),0),[offers]);

  async function startOffer(){
    if(!selected)return;
    setStarting(true);
    setError('');
    try{
      const result=await apiFetch<{url:string;clickToken:string}>(`/api/providers/offers/${selected.id}/click`,{method:'POST'});
      window.open(result.url,'_blank','noopener,noreferrer');
    }catch(err){setError(err instanceof Error ? err.message : 'Unable to start offer');}
    finally{setStarting(false);}
  }

  if(error&&!offers.length)return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!offers.length&&!error)return <LoadingPanel label="Loading live offers..." />;

  return <>
    <section className="hero-title">
      <h1>Live Earning Opportunities</h1>
      <p>{offers.length} fresh offers · Earn from verified provider inventory.</p>
      <div className="hero-meta"><span className="live-dot">Live provider feed</span><span className="hero-chip"><Globe2 size={15}/> Your eligible region</span></div>
    </section>

    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="toolbar">
      <div className="filters">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={'filter '+(category===c?'active':'')}>{c}</button>)}</div>
      <div className="offer-controls">
        <label className="sort-control"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value as SortMode)}><option value="high">Highest Pay</option><option value="low">Lowest Pay</option><option value="az">A–Z</option></select></label>
        <input className="search" placeholder="Search offers..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className="primary-button" disabled={refreshing} onClick={()=>void load()}><RefreshCw size={15}/>{refreshing?'Refreshing':'Refresh'}</button>
      </div>
    </div>

    {featured.length>0&&<>
      <div className="section-heading"><h2><Star size={22}/> Featured Offers</h2><span>{formatPoints(totalPoints)} total listed Coins</span></div>
      <div className="featured-strip">{featured.map(o=><OfferTile key={o.id} offer={o} featured actionLabel="Start" onAction={()=>setSelected(o)}/>)}</div>
    </>}

    <div className="section-heading"><h2><Signal size={22}/> All Offers ({filtered.length})</h2><span>Real-time inventory</span></div>
    {filtered.length
      ? <div className="offer-grid">{filtered.map(o=><OfferTile key={o.id} offer={o} actionLabel="Start" onAction={()=>setSelected(o)}/>)}</div>
      : <div className="panel empty-state"><b>No offers match this view</b><span>Try another category or clear your search.</span></div>}

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title" onClick={e=>e.stopPropagation()}>
        <div className="offer-art">{selected.image_url?<img src={selected.image_url} alt=""/>:selected.title.slice(0,1).toUpperCase()}</div>
        <h2 id="offer-modal-title">{selected.title}</h2>
        <div className="stats-grid">
          <div className="stat-card"><span>Reward</span><strong>{formatPoints(selected.reward_points)}</strong><em>Coins</em></div>
          <div className="stat-card"><span>Provider</span><strong style={{fontSize:17}}>{selected.provider_name||selected.provider_slug||'Provider'}</strong><em>External partner</em></div>
          <div className="stat-card"><span>Difficulty</span><strong style={{fontSize:17}}>{selected.difficulty||'Standard'}</strong><em>{selected.estimated_minutes?selected.estimated_minutes+' min':'Time varies'}</em></div>
          <div className="stat-card"><span>Category</span><strong style={{fontSize:17}}>{selected.category}</strong><em>Eligibility applies</em></div>
        </div>
        <div className="panel mt"><b>Requirements</b><p className="muted" style={{fontSize:13,lineHeight:1.55}}>{selected.description||'Follow the provider instructions and complete the offer in the same session.'}</p></div>
        <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button><button disabled={starting} className="primary-button" onClick={()=>void startOffer()}><Rocket size={15}/>{starting?'Opening...':'Start Offer'}</button></div>
      </div>
    </div>}
  </>;
}
