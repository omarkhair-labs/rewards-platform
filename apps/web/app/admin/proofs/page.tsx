'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { TaskSubmission } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function ProofReviewAdmin(){
  const [rows,setRows]=useState<TaskSubmission[]>([]);
  const [selected,setSelected]=useState<TaskSubmission|null>(null);
  const [status,setStatus]=useState('pending');
  const [note,setNote]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async(s='pending')=>{
    setError('');
    try{setRows(await apiFetch<TaskSubmission[]>('/api/admin/task-submissions?status='+encodeURIComponent(s)));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load proof queue');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load(status);},[load,status]);

  async function decide(decision:'in_review'|'approved'|'rejected'){
    if(!selected)return;
    setSaving(true);setError('');
    try{
      await apiFetch('/api/admin/task-submissions/'+selected.id,{method:'PATCH',body:JSON.stringify({decision,note:note||undefined})});
      setSelected(null);setNote('');await load(status);
    }catch(err){setError(err instanceof Error?err.message:'Failed to update proof');}
    finally{setSaving(false);}
  }

  if(loading)return <LoadingPanel label="Loading proof queue..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load(status)}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Proof Review</h1><p>Moderate submitted evidence before task rewards are credited.</p></div>
      <div className="filters">{['pending','in_review','approved','rejected'].map(s=><button key={s} className={'filter '+(status===s?'active':'')} onClick={()=>setStatus(s)}>{s.replace('_',' ')}</button>)}</div>
    </div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel"><table className="table"><thead><tr><th>User</th><th>Task</th><th>Reward</th><th>Proof</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead>
      <tbody>{rows.length?rows.map(r=><tr key={r.id}><td><b>{r.username}</b><br/><span className="muted">{r.email}</span></td><td>{r.task_title}</td><td>{formatPoints(r.reward_points)}</td><td>{r.proof_url?'URL':r.proof_file_url?'File':r.proof_text?'Text':'None'}</td><td><span className={'status-pill '+(r.status==='approved'?'available':'review')}>{r.status.replace('_',' ')}</span></td><td>{new Date(r.submitted_at).toLocaleString()}</td><td><button className="secondary-button" onClick={()=>{setSelected(r);setNote(r.review_note||'');}}>Review</button></td></tr>):<tr><td colSpan={7} className="admin-empty">No submissions in this queue.</td></tr>}</tbody>
    </table></div>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <h2>{selected.task_title}</h2>
      <div className="stats-grid">
        <div className="stat-card"><span>User</span><strong style={{fontSize:11}}>{selected.username}</strong></div>
        <div className="stat-card"><span>Reward</span><strong>{formatPoints(selected.reward_points)}</strong></div>
        <div className="stat-card"><span>Status</span><strong style={{fontSize:11}}>{selected.status.replace('_',' ')}</strong></div>
        <div className="stat-card"><span>Submitted</span><strong style={{fontSize:10}}>{new Date(selected.submitted_at).toLocaleDateString()}</strong></div>
      </div>
      <div className="section-heading"><h2>Submitted Proof</h2><span>Review before reward</span></div>
      {selected.proof_url&&<div className="panel"><b style={{fontSize:8}}>Proof URL</b><p style={{fontSize:8,overflowWrap:'anywhere'}}><a href={selected.proof_url} target="_blank" rel="noreferrer">{selected.proof_url}</a></p></div>}
      {selected.proof_text&&<div className="panel mt"><b style={{fontSize:8}}>Proof Text</b><p className="muted" style={{fontSize:8}}>{selected.proof_text}</p></div>}
      {selected.proof_file_url&&<div className="panel mt"><b style={{fontSize:8}}>Proof File</b><p style={{fontSize:8}}><a href={selected.proof_file_url} target="_blank" rel="noreferrer">Open uploaded evidence</a></p></div>}
      <div className="field mt"><label>Moderator Note</label><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional review note"/></div>
      <div className="modal-actions">
        <button disabled={saving} className="secondary-button" onClick={()=>void decide('in_review')}>Mark In Review</button>
        <button disabled={saving} className="danger-button" onClick={()=>void decide('rejected')}>Reject</button>
        <button disabled={saving} className="success-button" onClick={()=>void decide('approved')}>Approve & Credit</button>
      </div>
    </div></div>}
  </>;
}
