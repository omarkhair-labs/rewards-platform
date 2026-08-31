'use client';

import { useState } from 'react';
import { tasks } from '@/lib/demo';

export default function TasksPage(){
  const [selected,setSelected]=useState<(typeof tasks)[number]|null>(null);
  const [mode,setMode]=useState<'details'|'proof'>('details');
  const [filter,setFilter]=useState('All');

  const filtered = filter==='All' ? tasks : tasks.filter(t=>t.status===filter);

  return <>
    <section className="hero-title"><h1>🍇 Available Tasks</h1><p>Complete tasks, submit proof and wait for approval before rewards are added to your account.</p></section>
    <div className="center"><button className="primary-button" style={{padding:'7px 13px'}}>How it works</button></div>

    <div className="filters mt" style={{justifyContent:'center'}}>
      {['All','Available','In Review','Completed'].map(f=><button key={f} className={'filter '+(filter===f?'active':'')} onClick={()=>setFilter(f)}>{f}</button>)}
    </div>

    <div className="task-types">
      <div className="task-type"><b>Social Tasks</b><span>Follow, join & share</span></div>
      <div className="task-type"><b>Timed Tasks</b><span>Limited availability</span></div>
      <div className="task-type"><b>Reviews</b><span>Proof required</span></div>
      <div className="task-type"><b>Community</b><span>Special campaigns</span></div>
    </div>

    <div className="panel">
      <table className="table">
        <thead><tr><th>Task</th><th>Description</th><th>Reward</th><th>Quota</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{filtered.map(t=><tr key={t.id}>
          <td><b>{t.title}</b></td>
          <td className="muted">{t.category}</td>
          <td><span className="reward">{t.reward} Coins</span></td>
          <td>{t.quota}</td>
          <td><span className={'status-pill '+(t.status==='Available'?'available':'review')}>{t.status}</span></td>
          <td><button className="primary-button" onClick={()=>{setSelected(t);setMode('details')}}>{t.status==='In Review'?'View':'View details'}</button></td>
        </tr>)}</tbody>
      </table>
    </div>

    <div className="split mt">
      <div className="panel"><h2 style={{fontSize:10}}>Task Guidelines</h2><p className="muted" style={{fontSize:8}}>Complete every requirement exactly. Invalid or recycled proof can be rejected and repeated abuse may lock task access.</p></div>
      <div className="panel"><h2 style={{fontSize:10}}>Tips for Task Success</h2><p className="muted" style={{fontSize:8}}>Read carefully, submit a clear proof link and keep the proof available until moderation finishes.</p></div>
    </div>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        {mode==='details'?<>
          <h2>Task Details</h2>
          <div className="stats-grid">
            <div className="stat-card"><span>Task</span><strong>{selected.id}</strong><em>{selected.category}</em></div>
            <div className="stat-card"><span>Reward</span><strong>{selected.reward}</strong><em>Coins</em></div>
            <div className="stat-card"><span>Remaining</span><strong>{selected.quota.split('/')[0]}</strong><em>Slots used</em></div>
            <div className="stat-card"><span>Status</span><strong>{selected.status}</strong><em>Current state</em></div>
          </div>
          <div className="panel mt"><b style={{fontSize:9}}>Task instructions</b><ul className="muted" style={{fontSize:8,lineHeight:1.8}}><li>Open the required destination.</li><li>Complete the requested action once.</li><li>Copy a public proof URL.</li><li>Submit proof and wait for moderation.</li></ul></div>
          <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button>{selected.status==='Available'&&<button className="primary-button" onClick={()=>setMode('proof')}>Submit proof</button>}</div>
        </>:<>
          <h2>Submit Proof of Completion</h2>
          <div className="form-grid">
            <div className="field"><label>Proof URL</label><input placeholder="https://..."/></div>
            <div className="field"><label>Notes</label><textarea placeholder="Add anything the reviewer should know"/></div>
          </div>
          <div className="panel mt"><b style={{fontSize:8}}>Proof Guidelines</b><p className="muted" style={{fontSize:7}}>Use a valid accessible link, do not reuse proof from another task, and keep it available until review is complete.</p></div>
          <div className="modal-actions"><button className="secondary-button" onClick={()=>setMode('details')}>Back</button><button className="primary-button" onClick={()=>setSelected(null)}>Submit Proof</button></div>
        </>}
      </div>
    </div>}
  </>;
}