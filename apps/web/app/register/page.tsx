'use client';

import Link from 'next/link';

export default function RegisterPage(){
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'radial-gradient(circle at 70% 10%,rgba(25,150,107,.18),transparent 30%),#090b12'}}>
    <div className="panel form-card" style={{width:'min(460px,94vw)'}}>
      <div className="center"><div className="brand-mark" style={{margin:'0 auto 10px'}}>R</div><h1 style={{fontSize:18,marginBottom:4}}>Create account</h1><p className="muted" style={{fontSize:8}}>Join the rewards platform and start earning.</p></div>
      <div className="form-grid mt">
        <div className="field"><label>Username</label><input placeholder="Choose a username"/></div>
        <div className="field"><label>Email</label><input type="email" placeholder="you@example.com"/></div>
        <div className="field"><label>Password</label><input type="password" placeholder="At least 8 characters"/></div>
        <div className="field"><label>Referral code (optional)</label><input placeholder="Referral code"/></div>
        <button className="primary-button" style={{padding:10}}>Create account</button>
      </div>
      <p className="center muted" style={{fontSize:8}}>Already registered? <Link href="/login" style={{color:'#5baeff'}}>Sign in</Link></p>
    </div>
  </div>;
}