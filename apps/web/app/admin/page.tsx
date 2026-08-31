'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { AdminDashboard,TaskSubmission,AdminWithdrawal,FraudEvent } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function AdminOverview(){
  const [data,setData]=useState<AdminDashboard|null>(null);
  const [proofs,setProofs]=useState<TaskSubmission[]>([]);
  const [withdrawals,setWithdrawals]=useState<AdminWithdrawal[]>([]);
  const [fraud,setFraud]=useState<FraudEvent[]>([]);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setError('');
    try{
      const [d,p,w,f]=await Promise.all([
        apiFetch<AdminDashboard>('/api/admin/dashboard'),
        apiFetch<TaskSubmission[]>('/api/admin/task-submissions?status=pending'),
        apiFetch<AdminWithdrawal[]>('/api/admin/withdrawals?status=pending'),
        apiFetch<FraudEvent[]>('/api/admin/fraud-events')
      ]);
      setData(d);setProofs(p.slice(0,6));setWithdrawals(w.slice(0,6));setFraud(f.slice(0,6));
    }catch(err){setError(err instanceof Error?err.message:'Failed to load admin dashboard');}
  },[]);

  useEffect(()=>{void load();},[load]);

  if(error&&!data)return <ErrorPanel message={error} retry={()=>void load()}/>;
  if(!data)return <LoadingPanel label="Loading operations overview..." />;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Operations Overview</h1><p>Queues, balances and risk signals that need operator attention.</p></div>
      <button className="secondary-button" onClick={()=>void load()}>Refresh</button>
    </div>
    <div className="admin-grid">
      <div className="admin-card"><span>Total Users</span><strong>{data.users}</strong><em>Registered accounts</em></div>
      <div className="admin-card"><span>Proof Queue</span><strong>{data.taskQueue}</strong><em>Awaiting moderation</em></div>
      <div className="admin-card"><span>Withdrawal Queue</span><strong>{data.withdrawalQueue}</strong><em>Cashouts in progress</em></div>
      <div className="admin-card"><span>Credited Rewards</span><strong>{formatPoints(data.creditedRewardPoints)}</strong><em>Points issued</em></div>
      <div className="admin-card"><span>Fraud 24h</span><strong>{data.fraudEvents24h}</strong><em>Recent risk events</em></div>
    </div>

    <div className="split mt">
      <div className="panel">
        <div className="section-heading"><h2>Pending Proofs</h2><a href="/admin/proofs">Open queue</a></div>
        <table className="table"><thead><tr><th>User</th><th>Task</th><th>Reward</th><th>Submitted</th></tr></thead>
        <tbody>{proofs.length?proofs.map(p=><tr key={p.id}><td>{p.username}</td><td>{p.task_title}</td><td>{formatPoints(p.reward_points)}</td><td>{new Date(p.submitted_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={4} className="admin-empty">No pending proofs.</td></tr>}</tbody></table>
      </div>
      <div className="panel">
        <div className="section-heading"><h2>Pending Withdrawals</h2><a href="/admin/withdrawals">Open queue</a></div>
        <table className="table"><thead><tr><th>User</th><th>Method</th><th>Points</th><th>Requested</th></tr></thead>
        <tbody>{withdrawals.length?withdrawals.map(w=><tr key={w.id}><td>{w.username}</td><td>{w.method_key}</td><td>{formatPoints(w.points)}</td><td>{new Date(w.requested_at).toLocaleDateString()}</td></tr>):<tr><td colSpan={4} className="admin-empty">No pending withdrawals.</td></tr>}</tbody></table>
      </div>
    </div>

    <div className="panel mt">
      <div className="section-heading"><h2>Recent Risk Events</h2><a href="/admin/fraud">Review fraud log</a></div>
      <table className="table"><thead><tr><th>Severity</th><th>User</th><th>Event</th><th>IP</th><th>Date</th></tr></thead>
      <tbody>{fraud.length?fraud.map(f=><tr key={f.id}><td><span className={'status-pill '+(f.severity==='low'?'available':'review')}>{f.severity}</span></td><td>{f.username||'—'}</td><td>{f.event_type}</td><td>{f.ip_address||'—'}</td><td>{new Date(f.created_at).toLocaleString()}</td></tr>):<tr><td colSpan={5} className="admin-empty">No recent fraud events.</td></tr>}</tbody></table>
    </div>
  </>;
}
