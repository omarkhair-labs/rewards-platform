'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch, formatPoints } from '@/lib/api';
import type { Dashboard, PayoutCatalogMethod, Withdrawal, WithdrawalMethod } from '@/lib/types';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

function normalizedFields(method:PayoutCatalogMethod){
  return method.account_fields?.length
    ? method.account_fields
    : [{key:'account',label:'Account details',type:'text',required:true}];
}

export default function CashoutPage(){
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [catalog,setCatalog]=useState<PayoutCatalogMethod[]>([]);
  const [methods,setMethods]=useState<WithdrawalMethod[]>([]);
  const [withdrawals,setWithdrawals]=useState<Withdrawal[]>([]);
  const [method,setMethod]=useState<PayoutCatalogMethod|null>(null);
  const [accountDetails,setAccountDetails]=useState<Record<string,string>>({});
  const [points,setPoints]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{
      const [d,c,m,w]=await Promise.all([
        apiFetch<Dashboard>('/api/account/dashboard'),
        apiFetch<PayoutCatalogMethod[]>('/api/withdrawals/catalog'),
        apiFetch<WithdrawalMethod[]>('/api/withdrawals/methods'),
        apiFetch<Withdrawal[]>('/api/withdrawals')
      ]);
      setDashboard(d);setCatalog(c);setMethods(m);setWithdrawals(w);
    }catch(err){setError(err instanceof Error?err.message:'Failed to load cashout');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  function openMethod(next:PayoutCatalogMethod){
    setMethod(next);
    const existing=methods.find(m=>m.method_key===next.method_key);
    const details:Record<string,string>={};
    for(const field of normalizedFields(next)){
      const key=String(field.key||'account');
      details[key]=String(existing?.account_details?.[key]??'');
    }
    setAccountDetails(details);
  }

  async function requestCashout(e:FormEvent){
    e.preventDefault();
    if(!method)return;
    const amount=points.trim();
    if(!amount||BigInt(amount)<=0n){setError('Enter a valid coin amount');return;}

    setSubmitting(true);setError('');
    try{
      const requiredFields=normalizedFields(method).filter(f=>f.required!==false);
      for(const field of requiredFields){
        const key=String(field.key||'account');
        if(!String(accountDetails[key]||'').trim())throw new Error('Complete all payout account fields');
      }

      let saved=methods.find(m=>
        m.method_key===method.method_key &&
        JSON.stringify(m.account_details)===JSON.stringify(accountDetails)
      );

      if(!saved){
        saved=await apiFetch<WithdrawalMethod>('/api/withdrawals/methods',{
          method:'POST',
          body:JSON.stringify({
            methodKey:method.method_key,
            accountDetails,
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

      setMethod(null);setAccountDetails({});setPoints('');
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
      <p className="muted" style={{fontSize:8}}>Withdraw your available coins using an enabled payout method.</p>
      <div className="coin-display">💎 {formatPoints(balance)} Coins</div>
    </div>

    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="section-heading"><h2>Choose Payment Method</h2><span>{catalog.length} available</span></div>
    {catalog.length?<div className="payment-grid">
      {catalog.map(m=><button key={m.id} className="payment-card" onClick={()=>openMethod(m)}>
        <span>{m.name}</span>
        <small>{formatPoints(m.min_points)} min · {m.mode}</small>
      </button>)}
    </div>:<div className="panel center muted" style={{padding:30,fontSize:8}}>No payout methods are currently enabled.</div>}

    <div className="section-heading"><h2>Withdrawal History</h2><span>{withdrawals.length} requests</span></div>
    <div className="panel">
      <table className="table">
        <thead><tr><th>Method</th><th>Requested</th><th>Fee</th><th>Net</th><th>Status</th><th>Date</th><th>Reason</th></tr></thead>
        <tbody>{withdrawals.length?withdrawals.map(w=><tr key={w.id}><td>{w.method_key}</td><td>{formatPoints(w.points)}</td><td>{formatPoints(w.fee_points||0)}</td><td>{formatPoints(w.net_points??w.points)}</td><td><span className={'status-pill '+(w.status==='paid'?'available':'review')}>{w.status}</span></td><td>{new Date(w.requested_at).toLocaleDateString()}</td><td>{w.rejection_reason||'—'}</td></tr>):<tr><td colSpan={7} className="center muted" style={{padding:28}}>No withdrawals yet.</td></tr>}</tbody>
      </table>
    </div>

    {method&&<div className="modal-backdrop" onClick={()=>setMethod(null)}>
      <form className="modal" onClick={e=>e.stopPropagation()} onSubmit={requestCashout}>
        <h2>{method.name} cashout</h2>
        {method.instructions&&<div className="notice">{method.instructions}</div>}
        <div className="form-grid mt">
          {normalizedFields(method).map(field=>{
            const key=String(field.key||'account');
            const type=field.type==='email'?'email':field.type==='tel'?'tel':'text';
            return <div className="field" key={key}>
              <label>{field.label||key}</label>
              <input
                required={field.required!==false}
                type={type}
                value={accountDetails[key]||''}
                onChange={e=>setAccountDetails({...accountDetails,[key]:e.target.value})}
                placeholder={String(field.label||key)}
              />
            </div>;
          })}
          <div className="field"><label>Coins</label><input required inputMode="numeric" pattern="[0-9]+" value={points} onChange={e=>setPoints(e.target.value.replace(/\D/g,''))} placeholder="Amount"/></div>
        </div>
        <div className="panel mt">
          <b style={{fontSize:8}}>Available</b>
          <p className="muted" style={{fontSize:8}}>
            {formatPoints(balance)} Coins available. Minimum: {formatPoints(method.min_points)} Coins
            {method.fee_bps>0?' · Fee: '+(method.fee_bps/100).toFixed(2)+'%':''}.
            The amount is held while the operator processes the payout.
          </p>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setMethod(null)}>Cancel</button><button disabled={submitting} className="primary-button">{submitting?'Requesting...':'Request cashout'}</button></div>
      </form>
    </div>}
  </>;
}
