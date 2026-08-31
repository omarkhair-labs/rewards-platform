'use client';

import { FormEvent,useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { WatchCampaign } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

type FormState={title:string;mediaUrl:string;durationSeconds:string;rewardPoints:string;dailyLimit:string;isActive:boolean};
const blank:FormState={title:'',mediaUrl:'',durationSeconds:'30',rewardPoints:'100',dailyLimit:'1',isActive:true};

export default function WatchAdmin(){
  const [rows,setRows]=useState<WatchCampaign[]>([]);
  const [selected,setSelected]=useState<WatchCampaign|null>(null);
  const [form,setForm]=useState<FormState>(blank);
  const [showForm,setShowForm]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{setRows(await apiFetch<WatchCampaign[]>('/api/admin/watch-campaigns'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load watch campaigns');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  function open(row?:WatchCampaign){
    setShowForm(true);
    if(row){
      setSelected(row);
      setForm({
        title:row.title,mediaUrl:row.media_url,durationSeconds:String(row.duration_seconds),
        rewardPoints:String(row.reward_points),dailyLimit:String(row.daily_limit),isActive:row.is_active
      });
    }else{setSelected(null);setForm(blank);}
  }

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    const body={
      title:form.title,mediaUrl:form.mediaUrl,durationSeconds:Number(form.durationSeconds),
      rewardPoints:form.rewardPoints,dailyLimit:Number(form.dailyLimit),isActive:form.isActive
    };
    try{
      if(selected)await apiFetch('/api/admin/watch-campaigns/'+selected.id,{method:'PATCH',body:JSON.stringify(body)});
      else await apiFetch('/api/admin/watch-campaigns',{method:'POST',body:JSON.stringify(body)});
      setShowForm(false);setSelected(null);await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to save campaign');}
    finally{setSaving(false);}
  }

  async function toggle(row:WatchCampaign){
    try{await apiFetch('/api/admin/watch-campaigns/'+row.id,{method:'PATCH',body:JSON.stringify({isActive:!row.is_active})});await load();}
    catch(err){setError(err instanceof Error?err.message:'Failed to update campaign');}
  }

  if(loading)return <LoadingPanel label="Loading watch campaigns..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Watch & Earn</h1><p>Create timed media campaigns with daily limits and server-verified reward completion.</p></div>
      <button className="primary-button" onClick={()=>open()}>New Campaign</button>
    </div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel"><table className="table"><thead><tr><th>Campaign</th><th>Duration</th><th>Reward</th><th>Daily Limit</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{rows.length?rows.map(r=><tr key={r.id}><td><b>{r.title}</b><br/><span className="muted">{r.media_url}</span></td><td>{r.duration_seconds}s</td><td>{formatPoints(r.reward_points)}</td><td>{r.daily_limit}</td><td><span className={'status-pill '+(r.is_active?'available':'review')}>{r.is_active?'active':'disabled'}</span></td><td><div className="admin-actions"><button className="secondary-button" onClick={()=>open(r)}>Edit</button><button className={r.is_active?'danger-button':'success-button'} onClick={()=>void toggle(r)}>{r.is_active?'Disable':'Enable'}</button></div></td></tr>):<tr><td colSpan={6} className="admin-empty">No watch campaigns configured.</td></tr>}</tbody>
    </table></div>

    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onSubmit={save} onClick={e=>e.stopPropagation()}>
      <h2>{selected?'Edit Campaign':'Create Campaign'}</h2>
      <div className="form-grid">
        <div className="field"><label>Title</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div className="field"><label>Media URL</label><input required type="url" value={form.mediaUrl} onChange={e=>setForm({...form,mediaUrl:e.target.value})}/></div>
        <div className="split"><div className="field"><label>Duration Seconds</label><input required inputMode="numeric" value={form.durationSeconds} onChange={e=>setForm({...form,durationSeconds:e.target.value.replace(/\D/g,'')})}/></div><div className="field"><label>Reward Points</label><input required inputMode="numeric" value={form.rewardPoints} onChange={e=>setForm({...form,rewardPoints:e.target.value.replace(/\D/g,'')})}/></div></div>
        <div className="field"><label>Daily Limit</label><input required inputMode="numeric" value={form.dailyLimit} onChange={e=>setForm({...form,dailyLimit:e.target.value.replace(/\D/g,'')})}/></div>
        <label style={{fontSize:8}}><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active</label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button disabled={saving} className="primary-button">{saving?'Saving...':'Save Campaign'}</button></div>
    </form></div>}
  </>;
}
