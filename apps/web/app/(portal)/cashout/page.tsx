'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Dashboard, Withdrawal, WithdrawalMethod } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';
import { paymentMethods } from '@/lib/demo';

export default function CashoutPage(){
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [methods,setMethods]=useState<WithdrawalMethod[]>([]);
  const [withdrawals,setWithdrawals]=useState<Withdrawal[]>([]);
  const [method,setMethod]=useState<string|null>(null);
  const [account,setAccount]=useState('');
  const [points,setPoints]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{
      const [d,m,w]=await Promise.all([
        apiFetch<Dashboard>('/api/account/dashboard'),
        apiFetch<WithdrawalMethod[]>('/api/withdrawals/methods'),
        apiFetch<Withdrawal[]>('/api/withdrawals')
      ]);
      setDashboard(d);setMethods(m);setWithdrawals(w);
    }catch(err){setError(err instanceof Error?err.message:'Failed to load cashout');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  async function requestCashout(e:FormEvent){
    e.preventDefault();
    if(!method)return;
    const amount=points.trim();
    if(!amount||BigInt(amount)<=0n){setError('Enter a valid coin amount');return;}
    setSubmitting(true);setError('');
    try{
      let saved=methods.find(m=>m.method_key===method.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
      if(!saved){
        saved=await apiFetch<WithdrawalMethod>('/api/withdrawals/methods',{
          method:'POST',
          body:JSON.stringify({
            methodKey:method.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
            label:method,
            accountDetails:{account},
            isDefault:methods.length===0
          })
        });
      }
      await apiFetch<Withdrawal>('/api/withdrawals',{
        method:'POST',
        body:JSON.stringify({
          methodId:saved.id,
          points:amount,
          idempotencyKey:'cashout:'+crypto.randomUUID()
        })
      });
      setMethod(null);setAccount('');setPoints('');
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Unable to request cashout');}
    finally{setSubmitting(false);}
  }

  if(loading)return <LoadingPanel label="Loading cashout..." />;
  if(error&&!dashboard)return <ErrorPanel message={error} retry={()=>void load()}/>;

  const balance=dashboard?.wallet.available_points||0;

  return <>
    <div className="cashout-hero">
      <h1>Rewards Cashout</h1>
      <p className="muted" style={{fontSize:8}}>Withdraw your available coins using one of the supported payout methods.</p>
      <div className="coin-display">💎 {formatPoints(balance)} Coins</div>
    </div>

    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="section-heading"><h2>Choose Payment Method</h2><span>{paymentMethods.length} options</span></div>
    <div className="payment-grid">
      {paymentMethods.map(m=><button key={m} className="payment-card" onClick={()=>{setMethod(m);const existing=methods.find(x=>x.label===m);setAccount(String(existing?.account_details?.account||''));}}>{m}</button>)}
    </div>

    <div className="section-heading"><h2>Withdrawal History</h2><span>{withdrawals.length} requests</span></div>
    <div className="panel">
      <table className="table">
        <thead><tr><th>Method</th><th>Coins</th><th>Status</th><th>Requested</th><th>Reason</th></tr></thead>
        <tbody>{withdrawals.length?withdrawals.map(w=><tr key={w.id}><td>{w.method_key}</td><td>{formatPoints(w.points)}</td><td><span className={'status-pill '+(w.status==='paid'?'available':'review')}>{w.status}</span></td><td>{new Date(w.requested_at).toLocaleDateString()}</td><td>{w.rejection_reason||'—'}</td></tr>):<tr><td colSpan={5} className="center muted" style={{padding:28}}>No withdrawals yet.</td></tr>}</tbody>
      </table>
    </div>

    {method&&<div className="modal-backdrop" onClick={()=>setMethod(null)}>
      <form className="modal" onClick={e=>e.stopPropagation()} onSubmit={requestCashout}>
        <h2>{method} cashout</h2>
        <div className="form-grid">
          <div className="field"><label>Account details</label><input required value={account} onChange={e=>setAccount(e.target.value)} placeholder={'Enter '+method+' account'}/></div>
          <div className="field"><label>Coins</label><input required inputMode="numeric" pattern="[0-9]+" value={points} onChange={e=>setPoints(e.target.value.replace(/\D/g,''))} placeholder="Amount"/></div>
        </div>
        <div className="panel mt"><b style={{fontSize:8}}>Available</b><p className="muted" style={{fontSize:8}}>{formatPoints(balance)} Coins. The requested amount is held while the operator reviews the payout.</p></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setMethod(null)}>Cancel</button><button disabled={submitting} className="primary-button">{submitting?'Requesting...':'Request cashout'}</button></div>
      </form>
    </div>}
  </>;
}
