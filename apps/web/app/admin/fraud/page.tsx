'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { FraudEvent } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function FraudAdmin(){
  const [rows,setRows]=useState<FraudEvent[]>([]);
  const [selected,setSelected]=useState<FraudEvent|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setError('');
    try{setRows(await apiFetch<FraudEvent[]>('/api/admin/fraud-events'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load fraud events');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  if(loading)return <LoadingPanel label="Loading fraud events..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar"><div className="admin-title"><h1>Fraud Events</h1><p>Operational risk signals recorded by reward, account and payout controls.</p></div><button className="secondary-button" onClick={()=>void load()}>Refresh</button></div>
    <div className="panel"><table className="table"><thead><tr><th>Severity</th><th>User</th><th>Event</th><th>IP</th><th>User Agent</th><th>Date</th><th>Details</th></tr></thead>
      <tbody>{rows.length?rows.map(r=><tr key={r.id}><td><span className={'status-pill '+(r.severity==='low'?'available':'review')}>{r.severity}</span></td><td>{r.username||'—'}<br/><span className="muted">{r.email||''}</span></td><td>{r.event_type}</td><td>{r.ip_address||'—'}</td><td style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis'}}>{r.user_agent||'—'}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><button className="secondary-button" onClick={()=>setSelected(r)}>Inspect</button></td></tr>):<tr><td colSpan={7} className="admin-empty">No fraud events recorded.</td></tr>}</tbody>
    </table></div>
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><h2>{selected.event_type}</h2><pre className="json-block">{JSON.stringify(selected.metadata,null,2)}</pre><div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button></div></div></div>}
  </>;
}
