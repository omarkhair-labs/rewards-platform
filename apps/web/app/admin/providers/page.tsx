'use client';

import { FormEvent,useCallback,useEffect,useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { AdminProvider } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

type FormState={name:string;slug:string;kind:'offerwall'|'survey'|'payout';wallUrl:string;apiBaseUrl:string;signatureMode:string;publicConfig:string;secretConfig:string;isEnabled:boolean};
const blank:FormState={name:'',slug:'',kind:'offerwall',wallUrl:'',apiBaseUrl:'',signatureMode:'hmac_sha256',publicConfig:'{}',secretConfig:'{}',isEnabled:false};

export default function ProvidersAdmin(){
  const [rows,setRows]=useState<AdminProvider[]>([]);
  const [selected,setSelected]=useState<AdminProvider|null>(null);
  const [form,setForm]=useState<FormState>(blank);
  const [showForm,setShowForm]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{setRows(await apiFetch<AdminProvider[]>('/api/admin/providers'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load providers');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  function open(p?:AdminProvider){
    setShowForm(true);
    if(p){
      setSelected(p);
      setForm({name:p.name,slug:p.slug,kind:p.kind,wallUrl:p.wall_url||'',apiBaseUrl:p.api_base_url||'',signatureMode:p.signature_mode||'hmac_sha256',publicConfig:JSON.stringify(p.public_config||{},null,2),secretConfig:'{}',isEnabled:p.is_enabled});
    }else{setSelected(null);setForm(blank);}
  }

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    try{
      const publicConfig=JSON.parse(form.publicConfig||'{}');
      const secretConfig=JSON.parse(form.secretConfig||'{}');
      const body={name:form.name,slug:form.slug,kind:form.kind,wallUrl:form.wallUrl||undefined,apiBaseUrl:form.apiBaseUrl||undefined,signatureMode:form.signatureMode,publicConfig,isEnabled:form.isEnabled,...(Object.keys(secretConfig).length?{secretConfig}:{})};
      if(selected)await apiFetch('/api/admin/providers/'+selected.id,{method:'PATCH',body:JSON.stringify(body)});
      else await apiFetch('/api/admin/providers',{method:'POST',body:JSON.stringify({...body,secretConfig})});
      setShowForm(false);setSelected(null);await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to save provider');}
    finally{setSaving(false);}
  }

  async function toggle(p:AdminProvider){
    try{await apiFetch('/api/admin/providers/'+p.id,{method:'PATCH',body:JSON.stringify({isEnabled:!p.is_enabled})});await load();}
    catch(err){setError(err instanceof Error?err.message:'Failed to update provider');}
  }

  if(loading)return <LoadingPanel label="Loading providers..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar"><div className="admin-title"><h1>Providers</h1><p>Offerwalls, survey partners, payout adapters and signed callback configuration.</p></div><button className="primary-button" onClick={()=>open()}>New Provider</button></div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel"><table className="table"><thead><tr><th>Provider</th><th>Kind</th><th>Signature</th><th>Status</th><th>Public Config</th><th>Action</th></tr></thead>
      <tbody>{rows.length?rows.map(p=><tr key={p.id}><td><b>{p.name}</b><br/><span className="muted">{p.slug}</span></td><td>{p.kind}</td><td>{p.signature_mode}</td><td><span className={'status-pill '+(p.is_enabled?'available':'review')}>{p.is_enabled?'enabled':'disabled'}</span></td><td><code style={{fontSize:7}}>{Object.keys(p.public_config||{}).join(', ')||'—'}</code></td><td><div className="admin-actions"><button className="secondary-button" onClick={()=>open(p)}>Edit</button><button className={p.is_enabled?'danger-button':'success-button'} onClick={()=>void toggle(p)}>{p.is_enabled?'Disable':'Enable'}</button></div></td></tr>):<tr><td colSpan={6} className="admin-empty">No providers configured.</td></tr>}</tbody>
    </table></div>

    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onSubmit={save} onClick={e=>e.stopPropagation()}>
      <h2>{selected?'Edit Provider':'Create Provider'}</h2>
      <div className="form-grid">
        <div className="split"><div className="field"><label>Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div><div className="field"><label>Slug</label><input required pattern="[a-z0-9-]+" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase()})}/></div></div>
        <div className="field"><label>Kind</label><select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as FormState['kind']})}><option value="offerwall">Offerwall</option><option value="survey">Survey</option><option value="payout">Payout</option></select></div>
        <div className="field"><label>Wall URL</label><input value={form.wallUrl} onChange={e=>setForm({...form,wallUrl:e.target.value})} placeholder="https://..."/></div>
        <div className="field"><label>API Base URL</label><input value={form.apiBaseUrl} onChange={e=>setForm({...form,apiBaseUrl:e.target.value})} placeholder="https://..."/></div>
        <div className="field"><label>Signature Mode</label><input value={form.signatureMode} onChange={e=>setForm({...form,signatureMode:e.target.value})}/></div>
        <div className="field"><label>Public Config JSON</label><textarea value={form.publicConfig} onChange={e=>setForm({...form,publicConfig:e.target.value})}/></div>
        <div className="field"><label>Secret Config JSON {selected?'(leave {} to keep existing)':''}</label><textarea value={form.secretConfig} onChange={e=>setForm({...form,secretConfig:e.target.value})} placeholder='{"postbackSecret":"..."}'/></div>
        <label style={{fontSize:8}}><input type="checkbox" checked={form.isEnabled} onChange={e=>setForm({...form,isEnabled:e.target.checked})}/> Enabled</label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button disabled={saving} className="primary-button">{saving?'Saving...':'Save Provider'}</button></div>
    </form></div>}
  </>;
}
