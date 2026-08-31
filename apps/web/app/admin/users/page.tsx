'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { AdminUser } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function UsersAdmin(){
  const [users,setUsers]=useState<AdminUser[]>([]);
  const [selected,setSelected]=useState<AdminUser|null>(null);
  const [q,setQ]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async(search='')=>{
    setError('');
    try{setUsers(await apiFetch<AdminUser[]>('/api/admin/users'+(search?'?q='+encodeURIComponent(search):'')));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load users');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  async function patch(data:Record<string,unknown>){
    if(!selected)return;
    setSaving(true);setError('');
    try{
      await apiFetch('/api/admin/users/'+selected.id,{method:'PATCH',body:JSON.stringify(data)});
      setSelected(null);await load(q);
    }catch(err){setError(err instanceof Error?err.message:'Failed to update user');}
    finally{setSaving(false);}
  }

  if(loading)return <LoadingPanel label="Loading users..." />;
  if(error&&!users.length)return <ErrorPanel message={error} retry={()=>void load(q)}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Users</h1><p>Account status, roles, balances, premium access and withdrawal locks.</p></div>
      <div style={{display:'flex',gap:7}}><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search username or email"/><button className="primary-button" onClick={()=>void load(q)}>Search</button></div>
    </div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel">
      <table className="table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Available</th><th>Held</th><th>Lifetime</th><th>Premium</th><th>Created</th></tr></thead>
      <tbody>{users.length?users.map(u=><tr key={u.id} className="clickable-row" onClick={()=>setSelected(u)}><td><b>{u.username}</b><br/><span className="muted">{u.email}</span></td><td>{u.role}</td><td><span className={'status-pill '+(u.status==='active'?'available':'review')}>{u.status}</span></td><td>{formatPoints(u.available_points)}</td><td>{formatPoints(u.held_points)}</td><td>{formatPoints(u.lifetime_earned_points)}</td><td>{u.is_premium?'Yes':'No'}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={8} className="admin-empty">No users found.</td></tr>}</tbody></table>
    </div>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <h2>{selected.username}</h2>
      <div className="stats-grid">
        <div className="stat-card"><span>Available</span><strong>{formatPoints(selected.available_points)}</strong></div>
        <div className="stat-card"><span>Held</span><strong>{formatPoints(selected.held_points)}</strong></div>
        <div className="stat-card"><span>Level</span><strong>{selected.level}</strong><em>{selected.rank}</em></div>
        <div className="stat-card"><span>Premium</span><strong>{selected.is_premium?'Yes':'No'}</strong></div>
      </div>
      <div className="section-heading"><h2>Account Controls</h2><span>{selected.email}</span></div>
      <div className="admin-actions">
        <button disabled={saving} className="success-button" onClick={()=>void patch({status:'active'})}>Activate</button>
        <button disabled={saving} className="warning-button" onClick={()=>void patch({status:'suspended'})}>Suspend</button>
        <button disabled={saving} className="danger-button" onClick={()=>void patch({status:'banned'})}>Ban</button>
        <button disabled={saving} className="secondary-button" onClick={()=>void patch({isPremium:!selected.is_premium})}>{selected.is_premium?'Remove Premium':'Grant Premium'}</button>
        <button disabled={saving} className="secondary-button" onClick={()=>void patch({withdrawalLocked:true,withdrawalLockReason:'Locked by operator'})}>Lock Withdrawals</button>
        <button disabled={saving} className="secondary-button" onClick={()=>void patch({withdrawalLocked:false})}>Unlock Withdrawals</button>
      </div>
      <div className="field mt"><label>Role</label><select value={selected.role} onChange={e=>void patch({role:e.target.value})}><option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button></div>
    </div></div>}
  </>;
}
