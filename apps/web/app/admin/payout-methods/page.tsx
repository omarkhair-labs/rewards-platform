'use client';

import { FormEvent,useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { AdminPayoutMethod,AdminProvider } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

type FormState={
  methodKey:string;name:string;mode:'manual'|'api';providerId:string;instructions:string;
  accountFields:string;minPoints:string;feeBps:string;isEnabled:boolean;sortOrder:string;
};

const blank:FormState={
  methodKey:'',name:'',mode:'manual',providerId:'',instructions:'',accountFields:'[]',
  minPoints:'5000',feeBps:'0',isEnabled:true,sortOrder:'0'
};

export default function PayoutMethodsAdmin(){
  const [rows,setRows]=useState<AdminPayoutMethod[]>([]);
  const [providers,setProviders]=useState<AdminProvider[]>([]);
  const [selected,setSelected]=useState<AdminPayoutMethod|null>(null);
  const [form,setForm]=useState<FormState>(blank);
  const [showForm,setShowForm]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{
      const [m,p]=await Promise.all([
        apiFetch<AdminPayoutMethod[]>('/api/admin/payout-methods'),
        apiFetch<AdminProvider[]>('/api/admin/providers')
      ]);
      setRows(m);
      setProviders(p.filter(x=>x.kind==='payout'));
    }catch(err){setError(err instanceof Error?err.message:'Failed to load payout methods');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  function open(row?:AdminPayoutMethod){
    setShowForm(true);
    if(row){
      setSelected(row);
      setForm({
        methodKey:row.method_key,
        name:row.name,
        mode:row.mode,
        providerId:row.provider_id?String(row.provider_id):'',
        instructions:row.instructions||'',
        accountFields:JSON.stringify(row.account_fields||[],null,2),
        minPoints:String(row.min_points),
        feeBps:String(row.fee_bps),
        isEnabled:row.is_enabled,
        sortOrder:String(row.sort_order)
      });
    }else{
      setSelected(null);
      setForm(blank);
    }
  }

  async function save(e:FormEvent){
    e.preventDefault();
    setSaving(true);
    setError('');
    try{
      const accountFields=JSON.parse(form.accountFields||'[]');
      if(!Array.isArray(accountFields))throw new Error('Account Fields JSON must be an array');
      const body={
        methodKey:form.methodKey,
        name:form.name,
        mode:form.mode,
        providerId:form.providerId||null,
        instructions:form.instructions,
        accountFields,
        minPoints:form.minPoints,
        feeBps:Number(form.feeBps||0),
        isEnabled:form.isEnabled,
        sortOrder:Number(form.sortOrder||0)
      };
      if(selected)await apiFetch('/api/admin/payout-methods/'+selected.id,{method:'PATCH',body:JSON.stringify(body)});
      else await apiFetch('/api/admin/payout-methods',{method:'POST',body:JSON.stringify(body)});
      setShowForm(false);
      setSelected(null);
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to save payout method');}
    finally{setSaving(false);}
  }

  async function toggle(row:AdminPayoutMethod){
    try{
      await apiFetch('/api/admin/payout-methods/'+row.id,{
        method:'PATCH',
        body:JSON.stringify({isEnabled:!row.is_enabled})
      });
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to update payout method');}
  }

  if(loading)return <LoadingPanel label="Loading payout methods..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title">
        <h1>Payout Methods</h1>
        <p>Supported cashout methods, account fields, minimums, fees and operator/API mode.</p>
      </div>
      <button className="primary-button" onClick={()=>open()}>New Method</button>
    </div>

    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="panel">
      <table className="table">
        <thead><tr><th>Method</th><th>Mode</th><th>Provider</th><th>Minimum</th><th>Fee</th><th>Status</th><th>Order</th><th>Action</th></tr></thead>
        <tbody>{rows.length?rows.map(row=><tr key={row.id}>
          <td><b>{row.name}</b><br/><span className="muted">{row.method_key}</span></td>
          <td>{row.mode}</td>
          <td>{row.provider_name||row.provider_slug||'Manual operator'}</td>
          <td>{formatPoints(row.min_points)}</td>
          <td>{row.fee_bps?(row.fee_bps/100).toFixed(2)+'%':'0%'}</td>
          <td><span className={'status-pill '+(row.is_enabled?'available':'review')}>{row.is_enabled?'enabled':'disabled'}</span></td>
          <td>{row.sort_order}</td>
          <td><div className="admin-actions">
            <button className="secondary-button" onClick={()=>open(row)}>Edit</button>
            <button className={row.is_enabled?'danger-button':'success-button'} onClick={()=>void toggle(row)}>{row.is_enabled?'Disable':'Enable'}</button>
          </div></td>
        </tr>):<tr><td colSpan={8} className="admin-empty">No payout methods configured.</td></tr>}</tbody>
      </table>
    </div>

    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}>
      <form className="modal" onSubmit={save} onClick={e=>e.stopPropagation()}>
        <h2>{selected?'Edit Payout Method':'Create Payout Method'}</h2>
        <div className="form-grid">
          <div className="split">
            <div className="field"><label>Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="field"><label>Method Key</label><input required pattern="[a-z0-9-]+" value={form.methodKey} onChange={e=>setForm({...form,methodKey:e.target.value.toLowerCase()})}/></div>
          </div>
          <div className="split">
            <div className="field"><label>Mode</label><select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value as FormState['mode']})}><option value="manual">Manual</option><option value="api">API</option></select></div>
            <div className="field"><label>Payout Provider</label><select value={form.providerId} onChange={e=>setForm({...form,providerId:e.target.value})}><option value="">None / operator handled</option>{providers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          </div>
          <div className="field"><label>Instructions</label><textarea value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/></div>
          <div className="field"><label>Account Fields JSON</label><textarea value={form.accountFields} onChange={e=>setForm({...form,accountFields:e.target.value})} placeholder='[{"key":"email","label":"Account email","type":"email","required":true}]'/></div>
          <div className="split">
            <div className="field"><label>Minimum Points</label><input required inputMode="numeric" value={form.minPoints} onChange={e=>setForm({...form,minPoints:e.target.value.replace(/\D/g,'')})}/></div>
            <div className="field"><label>Fee Basis Points</label><input required inputMode="numeric" value={form.feeBps} onChange={e=>setForm({...form,feeBps:e.target.value.replace(/\D/g,'')})}/></div>
          </div>
          <div className="field"><label>Sort Order</label><input inputMode="numeric" value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:e.target.value.replace(/\D/g,'')})}/></div>
          <label style={{fontSize:8}}><input type="checkbox" checked={form.isEnabled} onChange={e=>setForm({...form,isEnabled:e.target.checked})}/> Enabled</label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button>
          <button disabled={saving} className="primary-button">{saving?'Saving...':'Save Method'}</button>
        </div>
      </form>
    </div>}
  </>;
}
