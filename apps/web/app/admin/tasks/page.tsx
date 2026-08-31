'use client';

import { FormEvent,useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { AdminTask } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

type FormState={title:string;description:string;category:string;rewardPoints:string;proofType:'url'|'text'|'file'|'none';maxCompletions:string;isRepeatable:boolean;isActive:boolean};
const blank:FormState={title:'',description:'',category:'Social',rewardPoints:'0',proofType:'url',maxCompletions:'',isRepeatable:false,isActive:true};

export default function TasksAdmin(){
  const [tasks,setTasks]=useState<AdminTask[]>([]);
  const [selected,setSelected]=useState<AdminTask|null>(null);
  const [form,setForm]=useState<FormState>(blank);
  const [showForm,setShowForm]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{setTasks(await apiFetch<AdminTask[]>('/api/admin/tasks'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load tasks');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  function open(t?:AdminTask){
    setShowForm(true);
    if(t){setSelected(t);setForm({title:t.title,description:t.description,category:t.category,rewardPoints:String(t.reward_points),proofType:t.proof_type,maxCompletions:t.max_completions?String(t.max_completions):'',isRepeatable:t.is_repeatable,isActive:t.is_active});}
    else{setSelected(null);setForm(blank);}
  }

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    const body={title:form.title,description:form.description,category:form.category,rewardPoints:form.rewardPoints,proofType:form.proofType,maxCompletions:form.maxCompletions?Number(form.maxCompletions):undefined,isRepeatable:form.isRepeatable,isActive:form.isActive};
    try{
      if(selected)await apiFetch('/api/admin/tasks/'+selected.id,{method:'PATCH',body:JSON.stringify(body)});
      else await apiFetch('/api/admin/tasks',{method:'POST',body:JSON.stringify(body)});
      setShowForm(false);setSelected(null);await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to save task');}
    finally{setSaving(false);}
  }

  if(loading)return <LoadingPanel label="Loading tasks..." />;
  if(error&&!tasks.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar"><div className="admin-title"><h1>Tasks</h1><p>Create campaigns, choose proof requirements, quotas and reward values.</p></div><button className="primary-button" onClick={()=>open()}>New Task</button></div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel"><table className="table"><thead><tr><th>Task</th><th>Category</th><th>Reward</th><th>Proof</th><th>Progress</th><th>Repeat</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{tasks.length?tasks.map(t=><tr key={t.id}><td><b>{t.title}</b></td><td>{t.category}</td><td>{formatPoints(t.reward_points)}</td><td>{t.proof_type}</td><td>{t.max_completions==null?t.completions_count:t.completions_count+' / '+t.max_completions}</td><td>{t.is_repeatable?'Yes':'No'}</td><td><span className={'status-pill '+(t.is_active?'available':'review')}>{t.is_active?'active':'disabled'}</span></td><td><button className="secondary-button" onClick={()=>open(t)}>Edit</button></td></tr>):<tr><td colSpan={8} className="admin-empty">No tasks configured.</td></tr>}</tbody>
    </table></div>

    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onSubmit={save} onClick={e=>e.stopPropagation()}>
      <h2>{selected?'Edit Task':'Create Task'}</h2>
      <div className="form-grid">
        <div className="field"><label>Title</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div className="split"><div className="field"><label>Category</label><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div><div className="field"><label>Reward</label><input inputMode="numeric" value={form.rewardPoints} onChange={e=>setForm({...form,rewardPoints:e.target.value.replace(/\D/g,'')})}/></div></div>
        <div className="split"><div className="field"><label>Proof Type</label><select value={form.proofType} onChange={e=>setForm({...form,proofType:e.target.value as FormState['proofType']})}><option value="url">URL</option><option value="text">Text</option><option value="file">File</option><option value="none">None</option></select></div><div className="field"><label>Max Completions</label><input inputMode="numeric" value={form.maxCompletions} onChange={e=>setForm({...form,maxCompletions:e.target.value.replace(/\D/g,'')})} placeholder="Unlimited"/></div></div>
        <label style={{fontSize:8}}><input type="checkbox" checked={form.isRepeatable} onChange={e=>setForm({...form,isRepeatable:e.target.checked})}/> Repeatable</label>
        <label style={{fontSize:8}}><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active</label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button disabled={saving} className="primary-button">{saving?'Saving...':'Save Task'}</button></div>
    </form></div>}
  </>;
}
