'use client';

import { useState } from 'react';
import { allOffers, featuredOffers } from '@/lib/demo';

export default function OffersPage(){
  const [selected,setSelected]=useState<(typeof allOffers)[number]|null>(null);
  const [category,setCategory]=useState('All');

  const offers = category==='All' ? allOffers : allOffers.filter(o=>o.category===category);
  const categories=['All','Apps','Surveys','Videos','Signups','Games'];

  return <>
    <section className="hero-title">
      <h1>Live Earning Opportunities</h1>
      <p>Browse available offers and choose the best reward for you.</p>
    </section>
    <div className="toolbar">
      <div className="filters">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={'filter '+(category===c?'active':'')}>{c}</button>)}</div>
      <input className="search" placeholder="Search offers..." />
    </div>

    <div className="section-heading"><h2>Featured Offers</h2><span>{featuredOffers.length} highlighted</span></div>
    <div className="offer-grid">
      {featuredOffers.map(o=><OfferCard key={o.id} offer={o} onOpen={()=>setSelected(o)} featured />)}
    </div>

    <div className="section-heading"><h2>All Offers</h2><span>{offers.length} opportunities</span></div>
    <div className="offer-grid">
      {offers.map(o=><OfferCard key={o.id} offer={o} onOpen={()=>setSelected(o)} />)}
    </div>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="offer-art">{selected.art}</div>
        <h2>{selected.title}</h2>
        <div className="stats-grid">
          <div className="stat-card"><span>Reward</span><strong>{selected.reward}</strong><em>Coins</em></div>
          <div className="stat-card"><span>Provider</span><strong>{selected.provider}</strong><em>Verified provider</em></div>
          <div className="stat-card"><span>Difficulty</span><strong>Easy</strong><em>Approx. 10 min</em></div>
          <div className="stat-card"><span>Category</span><strong>{selected.category}</strong><em>Eligible</em></div>
        </div>
        <div className="panel mt"><b style={{fontSize:9}}>Requirements</b><p className="muted" style={{fontSize:8}}>Open the provider, follow all steps, use accurate information and keep the same session until completion.</p></div>
        <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button><button className="primary-button">Start Offer</button></div>
      </div>
    </div>}
  </>;
}

function OfferCard({offer,onOpen,featured=false}:{offer:(typeof allOffers)[number];onOpen:()=>void;featured?:boolean}){
  return <div className={'offer-card '+(featured?'featured':'')}>
    <span className="offer-badge">{offer.badge}</span>
    <div className="offer-art">{offer.art}</div>
    <h3>{offer.title}</h3><p>{offer.provider} · {offer.category}</p>
    <div className="offer-footer"><span className="reward">{offer.reward} Coins</span><button className="primary-button" onClick={onOpen}>View</button></div>
  </div>;
}