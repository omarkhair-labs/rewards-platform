'use client';

import { useState } from 'react';
import { paymentMethods } from '@/lib/demo';

export default function CashoutPage(){
  const [method,setMethod]=useState<string|null>(null);
  return <>
    <div className="cashout-hero">
      <h1>🔥 Rewards Cashout</h1>
      <p className="muted" style={{fontSize:8}}>Withdraw your earnings using one of the available payment methods.</p>
      <div className="coin-display">💎 0 Coins</div>
    </div>
    <div className="section-heading"><h2>Choose Payment Method</h2><span>{paymentMethods.length} available</span></div>
    <div className="payment-grid">
      {paymentMethods.map(m=><button key={m} className="payment-card" onClick={()=>setMethod(m)}>{m}</button>)}
    </div>
    <div className="panel mt">
      <h2 style={{fontSize:10,marginTop:0}}>Cashout rules</h2>
      <p className="muted" style={{fontSize:8,marginBottom:0}}>Your account must meet the minimum balance and security requirements. Requests are reviewed before payout.</p>
    </div>
    {method&&<div className="modal-backdrop" onClick={()=>setMethod(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>{method} cashout</h2>
        <div className="form-grid">
          <div className="field"><label>Account details</label><input placeholder={'Enter '+method+' account'}/></div>
          <div className="field"><label>Coins</label><input type="number" placeholder="Amount"/></div>
        </div>
        <div className="modal-actions"><button className="secondary-button" onClick={()=>setMethod(null)}>Cancel</button><button className="primary-button">Request cashout</button></div>
      </div>
    </div>}
  </>;
}