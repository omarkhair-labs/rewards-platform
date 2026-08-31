'use client';

import { useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { LevelRule } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

export default function ProductSettingsAdmin(){
  const [rules,setRules]=useState<LevelRule[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setError('');
    try{setRules(await apiFetch<LevelRule[]>('/api/admin/level-rules'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load product rules');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  if(loading)return <LoadingPanel label="Loading product rules..." />;
  if(error&&!rules.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Levels & Premium</h1><p>Current progression thresholds and operator-managed premium rules.</p></div>
      <button className="secondary-button" onClick={()=>void load()}>Refresh</button>
    </div>

    <div className="split">
      <div className="panel">
        <div className="section-heading"><h2>Level Progression</h2><span>Lifetime earning thresholds</span></div>
        <table className="table"><thead><tr><th>Level</th><th>Rank</th><th>Minimum Lifetime Points</th></tr></thead>
          <tbody>{rules.map(r=><tr key={r.level}><td>{r.level}</td><td><b>{r.rank}</b></td><td>{formatPoints(r.min_lifetime_points)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="panel">
        <div className="section-heading"><h2>Premium Policy</h2><span>Operator controlled</span></div>
        <div className="admin-card"><span>Grant options</span><strong style={{fontSize:13}}>30d · 90d · Lifetime</strong><em>Managed from Users</em></div>
        <div className="admin-card mt"><span>Expiration behavior</span><strong style={{fontSize:13}}>Automatic at read time</strong><em>Expired accounts render as Free</em></div>
        <div className="admin-card mt"><span>Level model</span><strong style={{fontSize:13}}>Monotonic</strong><em>Rank follows lifetime earned points</em></div>
      </div>
    </div>

    <div className="notice mt">Level changes are recalculated automatically after any wallet credit, including referral commissions. Reward reversals do not reduce lifetime progression.</div>
  </>;
}
