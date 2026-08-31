'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { AdminWithdrawal } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function WithdrawalsAdmin(){
  const [rows,setRows]=useState<AdminWithdrawal[]>([]);
  const [selected,setSelected]=useState<AdminWithdrawal|null>(null);
  const [status,setStatus]=useState('pending');
  const [reference,setReference]=useState('');
  const [reason,setReason]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async(s='pending')=>{
    setError('');
    try{setRows(await apiFetch<AdminWithdrawal[]>('/api/admin/withdrawals?status='+encodeURIComponent(s)));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load withdrawals');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load(status);},[load,status]);

  async function update(next:'in_review'|'processing'|'paid'|'rejected'|'failed'){
    if(!selected)return;
    setSaving(true);setError('');
    try{
      await apiFetch('/api/admin/withdrawals/'+selected.id,{method:'PATCH',body:JSON.stringify({status:next,providerReference:reference||undefined,reason:reason||undefined})});
      setSelected(null);setReference('');setReason('');await load(status);
    }catch(err){setError(err instanceof Error?err.message:'Failed to update withdrawal');}
    finally{setSaving(false);}
  }

  if(loading)return <LoadingPanel label="Loading withdrawal queue..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load(status)}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Withdrawals</h1><p>Review cashout details, move requests through processing and settle held balances.</p></div>
      <div className="filters">{['pending','in_review','processing','paid','rejected','failed'].map(s=><button key={s} className={'filter '+(status===s?'active':'')} onClick={()=>setStatus(s)}>{s.replace('_',' ')}</button>)}</div>
    </div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel"><table className="table"><thead><tr><th>User</th><th>Method</th><th>Points</th><th>Status</th><th>Requested</th><th>Reference</th><th>Action</th></tr></thead>
      <tbody>{rows.length?rows.map(w=><tr key={w.id}><td><b>{w.username}</b><br/><span className="muted">{w.email}</span></td><td>{w.method_key}</td><td>{formatPoints(w.points)}</td><td><span className={'status-pill '+(w.status==='paid'?'available':'review')}>{w.status.replace('_',' ')}</span></td><td>{new Date(w.requested_at).toLocaleString()}</td><td>{w.provider_reference||'—'}</td><td><button className="secondary-button" onClick={()=>{setSelected(w);setReference(w.provider_reference||'');setReason(w.rejection_reason||'');}}>Review</button></td></tr>):<tr><td colSpan={7} className="admin-empty">No withdrawals in this queue.</td></tr>}</tbody>
    </table></div>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <h2>Withdrawal #{selected.id}</h2>
      <div className="stats-grid">
        <div className="stat-card"><span>User</span><strong style={{fontSize:11}}>{selected.username}</strong></div>
        <div className="stat-card"><span>Method</span><strong style={{fontSize:11}}>{selected.method_key}</strong></div>
        <div className="stat-card"><span>Points</span><strong>{formatPoints(selected.points)}</strong></div>
        <div className="stat-card"><span>Status</span><strong style={{fontSize:10}}>{selected.status}</strong></div>
      </div>
      <div className="section-heading"><h2>Account Snapshot</h2><span>Captured at request time</span></div>
      <pre className="json-block">{JSON.stringify(selected.account_snapshot,null,2)}</pre>
      <div className="form-grid mt">
        <div className="field"><label>Provider / Payment Reference</label><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Transaction/reference ID"/></div>
        <div className="field"><label>Reason / Operator Note</label><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required for reject/fail"/></div>
      </div>
      <div className="modal-actions">
        <button disabled={saving} className="secondary-button" onClick={()=>void update('in_review')}>In Review</button>
        <button disabled={saving} className="warning-button" onClick={()=>void update('processing')}>Processing</button>
        <button disabled={saving} className="danger-button" onClick={()=>void update('rejected')}>Reject & Release</button>
        <button disabled={saving} className="success-button" onClick={()=>void update('paid')}>Mark Paid</button>
      </div>
    </div></div>}
  </>;
}
