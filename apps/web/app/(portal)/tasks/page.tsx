'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Eye, FileCheck2, ListTodo, RefreshCw, Search } from 'lucide-react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Task } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

type StatusTab='all'|'available'|'review'|'completed';

export default function TasksPage(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [selected,setSelected]=useState<Task|null>(null);
  const [proofUrl,setProofUrl]=useState('');
  const [proofText,setProofText]=useState('');
  const [proofFile,setProofFile]=useState<File|null>(null);
  const [category,setCategory]=useState('All');
  const [tab,setTab]=useState<StatusTab>('all');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{setTasks(await apiFetch<Task[]>('/api/tasks'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load tasks');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const categories=useMemo(()=>['All',...Array.from(new Set(tasks.map(t=>t.category))).sort()],[tasks]);
  const filtered=useMemo(()=>tasks.filter(t=>{
    if(tab==='completed')return false;
    const categoryMatch=category==='All'||t.category===category;
    const statusMatch=tab==='all'||(tab==='available'&&!t.already_submitted)||(tab==='review'&&t.already_submitted);
    return categoryMatch&&statusMatch;
  }),[tasks,category,tab]);
  const inReview=tasks.filter(t=>t.already_submitted).length;
  const available=tasks.length-inReview;

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!selected)return;
    setSubmitting(true);setError('');
    try{
      const body:Record<string,string>={};
      if(proofUrl.trim())body.proofUrl=proofUrl.trim();
      if(proofText.trim())body.proofText=proofText.trim();
      if(selected.proof_type==='file'){
        if(!proofFile)throw new Error('Choose a proof file first');
        const init=await apiFetch<{uploadUrl:string;publicUrl:string;headers:Record<string,string>}>('/api/uploads/proof',{method:'POST',body:JSON.stringify({filename:proofFile.name,contentType:proofFile.type,contentLength:proofFile.size})});
        const upload=await fetch(init.uploadUrl,{method:'PUT',headers:init.headers,body:proofFile});
        if(!upload.ok)throw new Error('Proof file upload failed');
        body.proofFileUrl=init.publicUrl;
      }
      await apiFetch(`/api/tasks/${selected.id}/submit`,{method:'POST',body:JSON.stringify(body)});
      setSelected(null);setProofUrl('');setProofText('');setProofFile(null);
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Unable to submit proof');}
    finally{setSubmitting(false);}
  }

  if(loading)return <LoadingPanel label="Loading tasks..." />;
  if(error&&!tasks.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <section className="hero-title">
      <h1>Available Tasks</h1>
      <p>Complete tasks to earn rewards. Submit valid proof and track your progress.</p>
      <div className="page-actions"><Link className="primary-button" href="/dashboard"><ArrowLeft size={15}/> Back to Dashboard</Link><span className="live-dot">Tasks updated</span></div>
    </section>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="task-tabs">
      <button className={'filter '+(tab==='all'?'active':'')} onClick={()=>setTab('all')}>All Tasks</button>
      <button className={'filter '+(tab==='available'?'active':'')} onClick={()=>setTab('available')}>Available</button>
      <button className={'filter '+(tab==='review'?'active':'')} onClick={()=>setTab('review')}>In Review</button>
      <button className={'filter '+(tab==='completed'?'active':'')} onClick={()=>setTab('completed')}>Completed</button>
    </div>

    <div className="stats-grid">
      <div className="stat-card"><span className="summary-icon">📋</span><strong>{tasks.length}</strong><span>Total Tasks</span></div>
      <div className="stat-card"><span className="summary-icon">⏳</span><strong>{available}</strong><span>Available</span></div>
      <div className="stat-card"><span className="summary-icon">🔍</span><strong>{inReview}</strong><span>In Review</span></div>
      <div className="stat-card"><span className="summary-icon">✅</span><strong>0</strong><span>Completed</span></div>
    </div>

    <div className="toolbar mt">
      <div className="filters">{categories.map(f=><button key={f} className={'filter '+(category===f?'active':'')} onClick={()=>setCategory(f)}>{f}</button>)}</div>
      <button className="secondary-button" onClick={()=>void load()}><RefreshCw size={15}/> Refresh Tasks</button>
    </div>

    <div className="panel table-wrap">
      <table className="table">
        <thead><tr><th>Task</th><th>Description</th><th>Reward</th><th>Status</th><th>Progress</th><th>Actions</th></tr></thead>
        <tbody>{filtered.length?filtered.map(t=><tr key={t.id}>
          <td><b>{t.title}</b><br/><span className="muted">{t.category}</span></td>
          <td style={{maxWidth:320}}>{t.description}</td>
          <td><span className="reward">{formatPoints(t.reward_points)} Coins</span></td>
          <td><span className={'status-pill '+(t.already_submitted?'review':'available')}>{t.already_submitted?'IN REVIEW':'AVAILABLE'}</span></td>
          <td>{t.max_completions==null?'Open':`${t.completions_count||0} / ${t.max_completions}`}</td>
          <td><button disabled={t.already_submitted} className="primary-button" onClick={()=>setSelected(t)}><Eye size={14}/>{t.already_submitted?'Submitted':'View Details'}</button></td>
        </tr>):<tr><td colSpan={6}><div className="empty-state"><b>No tasks in this view</b><span>Try another status or category filter.</span></div></td></tr>}</tbody>
      </table>
    </div>

    <div className="task-guides mt">
      <div className="panel">
        <div className="profile-section-head"><div><h2>Task Guidelines</h2><p>What moderators expect from each submission.</p></div><FileCheck2 size={24}/></div>
        <div className="guide-list">
          <div className="guide-row"><i>🎯</i><div><b>Complete accurately</b><span>Follow every task instruction carefully before submitting.</span></div></div>
          <div className="guide-row"><i>📸</i><div><b>Provide proof</b><span>Use a clear, relevant link, note or file for the selected task.</span></div></div>
          <div className="guide-row"><i>⏰</i><div><b>Allow review time</b><span>Submissions remain in review until a moderator decides.</span></div></div>
          <div className="guide-row"><i>🚫</i><div><b>Keep it genuine</b><span>Invalid or reused proof can be rejected.</span></div></div>
        </div>
      </div>
      <div className="panel">
        <div className="profile-section-head"><div><h2>Tips for Success</h2><p>Simple habits that reduce review delays.</p></div><CheckCircle2 size={24}/></div>
        <div className="guide-list">
          <div className="guide-row"><i><ListTodo size={18}/></i><div><b>Read carefully</b><span>Review the full description before you start.</span></div></div>
          <div className="guide-row"><i><Search size={18}/></i><div><b>Check your evidence</b><span>Make sure the important result is easy to see.</span></div></div>
          <div className="guide-row"><i><Clock3 size={18}/></i><div><b>Act promptly</b><span>Complete limited tasks before their quota fills.</span></div></div>
        </div>
      </div>
    </div>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onClick={e=>e.stopPropagation()} onSubmit={submit}>
        <h2 id="task-modal-title">Task Details</h2>
        <div className="stats-grid">
          <div className="stat-card"><span>Task ID</span><strong style={{fontSize:18}}>#{selected.id}</strong></div>
          <div className="stat-card"><span>Reward</span><strong>{formatPoints(selected.reward_points)}</strong><em>Coins after approval</em></div>
          <div className="stat-card"><span>Proof</span><strong style={{fontSize:18}}>{selected.proof_type}</strong></div>
          <div className="stat-card"><span>Status</span><strong style={{fontSize:18}}>Available</strong></div>
        </div>
        <div className="panel mt"><b>Task Instructions</b><p className="muted" style={{fontSize:13,lineHeight:1.55}}>{selected.description}</p></div>
        <div className="form-grid mt">
          {(selected.proof_type==='url'||selected.proof_type==='none')&&<div className="field"><label>Proof URL {selected.proof_type==='none'?'(optional)':''}</label><input value={proofUrl} onChange={e=>setProofUrl(e.target.value)} required={selected.proof_type==='url'} placeholder="https://..."/></div>}
          {(selected.proof_type==='text'||selected.proof_type==='url'||selected.proof_type==='none')&&<div className="field"><label>Notes</label><textarea value={proofText} onChange={e=>setProofText(e.target.value)} required={selected.proof_type==='text'} placeholder="Add proof details for the reviewer"/></div>}
          {selected.proof_type==='file'&&<><div className="field"><label>Proof File</label><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required onChange={e=>setProofFile(e.target.files?.[0]||null)}/></div><div className="notice">Accepted: PNG, JPG, WebP or PDF up to 10 MB.</div></>}
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setSelected(null);setProofFile(null);}}>Close</button><button disabled={submitting} className="primary-button">{submitting?'Submitting...':'Submit Proof'}</button></div>
      </form>
    </div>}
  </>;
}
