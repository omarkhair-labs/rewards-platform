'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { AuditLog } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function AuditAdmin(){
  const [rows,setRows]=useState<AuditLog[]>([]);
  const [selected,setSelected]=useState<AuditLog|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setError('');
    try{setRows(await apiFetch<AuditLog[]>('/api/admin/audit-logs'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load audit log');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  if(loading)return <LoadingPanel label="Loading audit log..." />;
  if(error&&!rows.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar"><div className="admin-title"><h1>Audit Log</h1><p>Operator actions and sensitive state changes across the platform.</p></div><button className="secondary-button" onClick={()=>void load()}>Refresh</button></div>
    <div className="panel"><table className="table"><thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Date</th><th>Metadata</th></tr></thead>
      <tbody>{rows.length?rows.map(r=><tr key={r.id}><td>{r.actor_username||'System'}</td><td><code>{r.action}</code></td><td>{r.entity_type}</td><td>{r.entity_id||'—'}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><button className="secondary-button" onClick={()=>setSelected(r)}>View</button></td></tr>):<tr><td colSpan={6} className="admin-empty">No audit records yet.</td></tr>}</tbody>
    </table></div>
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><h2>{selected.action}</h2><pre className="json-block">{JSON.stringify(selected.metadata,null,2)}</pre><div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button></div></div></div>}
  </>;
}
