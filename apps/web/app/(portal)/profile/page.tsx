'use client';

import { useState } from 'react';

export default function ProfilePage(){
  const [tab,setTab]=useState<'earnings'|'withdrawals'>('earnings');
  return <>
    <div className="panel">
      <div className="profile-head">
        <div className="profile-avatar">M</div>
        <div className="profile-meta">
          <h1>Mostafa</h1>
          <p>Member account · Egypt</p>
          <div className="level-row"><span className="level-badge">BRONZE</span><span className="level-badge" style={{background:'#57e6a1'}}>LEVEL 1</span></div>
        </div>
        <div style={{marginLeft:'auto'}}><button className="primary-button">Edit profile</button></div>
      </div>
    </div>

    <div className="stats-grid mt">
      <div className="stat-card"><span>Earnings Overview</span><strong>0 Coins</strong><em>Lifetime earnings</em></div>
      <div className="stat-card"><span>Activity Stats</span><strong>0</strong><em>Completed activities</em></div>
      <div className="stat-card"><span>Referral Program</span><strong>0</strong><em>Invited members</em></div>
      <div className="stat-card"><span>Security Score</span><div className="progress-ring" style={{marginTop:7}}><b>55</b></div></div>
    </div>

    <div className="panel mt">
      <div className="section-heading"><h2>Earning Breakdown</h2><span>Performance period</span></div>
      <div className="stats-grid">
        <div className="stat-card"><span>Today</span><strong>0</strong></div>
        <div className="stat-card"><span>This Week</span><strong>0</strong></div>
        <div className="stat-card"><span>This Month</span><strong>0</strong></div>
        <div className="stat-card"><span>All Time</span><strong>0</strong></div>
      </div>
    </div>

    <div className="panel mt">
      <div className="filters"><button className={'filter '+(tab==='earnings'?'active':'')} onClick={()=>setTab('earnings')}>Earnings</button><button className={'filter '+(tab==='withdrawals'?'active':'')} onClick={()=>setTab('withdrawals')}>Withdrawals</button></div>
      <div style={{padding:'22px 4px'}} className="muted">{tab==='earnings'?'No earnings yet. Start with an offer, survey or task.':'No withdrawals yet.'}</div>
    </div>

    <div className="panel mt">
      <div className="section-heading"><h2>Privacy Settings</h2><span className="status-pill available">Public</span></div>
      <p className="muted" style={{fontSize:8}}>Control whether your public profile and earning badges are visible to other members.</p>
      <div className="split">
        <div className="panel"><b style={{fontSize:9}}>Public visibility</b><p className="muted" style={{fontSize:7}}>Show username, level and public badges.</p><button className="secondary-button">Edit privacy</button></div>
        <div className="panel"><b style={{fontSize:9}}>Security recommendations</b><p className="muted" style={{fontSize:7}}>Verify your email, use a strong password and keep withdrawal details current.</p><button className="secondary-button">Review security</button></div>
      </div>
    </div>
  </>;
}