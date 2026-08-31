'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Task } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

export default function TasksPage(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [selected,setSelected]=useState<Task|null>(null);
  const [proofUrl,setProofUrl]=useState('');
  const [proofText,setProofText]=useState('');
  const [proofFile,setProofFile]=useState<File|null>(null);
  const [filter,setFilter]=useState('All');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{ setTasks(await apiFetch<Task[]>('/api/tasks')); }
    catch(err){ setError(err instanceof Error ? err.message : 'Failed to load tasks'); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{void load();},[load]);

  const categories=useMemo(()=>['All',...Array.from(new Set(tasks.map(t=>t.category))).sort()],[tasks]);
  const filtered=filter==='All'?tasks:tasks.filter(t=>t.category===filter);

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
        const init=await apiFetch<{uploadUrl:string;publicUrl:string;headers:Record<string,string>}>('/api/uploads/proof',{
          method:'POST',
          body:JSON.stringify({filename:proofFile.name,contentType:proofFile.type,contentLength:proofFile.size})
        });
        const upload=await fetch(init.uploadUrl,{method:'PUT',headers:init.headers,body:proofFile});
        if(!upload.ok)throw new Error('Proof file upload failed');
        body.proofFileUrl=init.publicUrl;
      }

      await apiFetch(`/api/tasks/${selected.id}/submit`,{method:'POST',body:JSON.stringify(body)});
      setSelected(null);setProofUrl('');setProofText('');setProofFile(null);
      await load();
    }catch(err){setError(err instanceof Error ? err.message : 'Unable to submit proof');}
    finally{setSubmitting(false);}
  }

  if(loading)return <LoadingPanel label="Loading tasks..." />;
  if(error&&!tasks.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <section className="hero-title"><h1>Available Tasks</h1><p>Complete the requirement, submit proof, and receive the reward only after moderation approval.</p></section>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="filters mt" style={{justifyContent:'center'}}>{categories.map(f=><button key={f} className={'filter '+(filter===f?'active':'')} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <div className="panel mt">
      <table className="table">
        <thead><tr><th>Task</th><th>Category</th><th>Reward</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{filtered.length?filtered.map(t=><tr key={t.id}>
          <td><b>{t.title}</b></td><td>{t.category}</td>
          <td><span className="reward">{formatPoints(t.reward_points)} Coins</span></td>
          <td>{t.max_completions==null?'Open':`${t.completions_count||0} / ${t.max_completions}`}</td>
          <td><span className={'status-pill '+(t.already_submitted?'review':'available')}>{t.already_submitted?'Submitted':'Available'}</span></td>
          <td><button disabled={t.already_submitted} className="primary-button" onClick={()=>setSelected(t)}>{t.already_submitted?'In review':'View details'}</button></td>
        </tr>):<tr><td colSpan={6} className="center muted" style={{padding:30}}>No tasks available right now.</td></tr>}</tbody>
      </table>
    </div>
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <form className="modal" onClick={e=>e.stopPropagation()} onSubmit={submit}>
        <h2>{selected.title}</h2>
        <div className="stats-grid">
          <div className="stat-card"><span>Reward</span><strong>{formatPoints(selected.reward_points)}</strong><em>Coins after approval</em></div>
          <div className="stat-card"><span>Category</span><strong>{selected.category}</strong></div>
          <div className="stat-card"><span>Proof</span><strong>{selected.proof_type}</strong></div>
          <div className="stat-card"><span>Status</span><strong>Available</strong></div>
        </div>
        <div className="panel mt"><b style={{fontSize:9}}>Instructions</b><p className="muted" style={{fontSize:8}}>{selected.description}</p></div>
        <div className="form-grid mt">
          {(selected.proof_type==='url'||selected.proof_type==='none')&&<div className="field"><label>Proof URL {selected.proof_type==='none'?'(optional)':''}</label><input value={proofUrl} onChange={e=>setProofUrl(e.target.value)} required={selected.proof_type==='url'} placeholder="https://..."/></div>}
          {(selected.proof_type==='text'||selected.proof_type==='url'||selected.proof_type==='none')&&<div className="field"><label>Notes</label><textarea value={proofText} onChange={e=>setProofText(e.target.value)} required={selected.proof_type==='text'} placeholder="Add proof details for the reviewer"/></div>}
          {selected.proof_type==='file'&&<><div className="field"><label>Proof File</label><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required onChange={e=>setProofFile(e.target.files?.[0]||null)}/></div><div className="notice">Accepted: PNG, JPG, WebP or PDF up to 10 MB. The file is uploaded directly to secured object storage before submission.</div></>}
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setSelected(null);setProofFile(null);}}>Close</button><button disabled={submitting} className="primary-button">{submitting?'Submitting...':'Submit Proof'}</button></div>
      </form>
    </div>}
  </>;
}
