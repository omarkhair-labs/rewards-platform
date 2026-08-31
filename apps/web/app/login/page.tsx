'use client';

import Link from 'next/link';

export default function LoginPage(){
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'radial-gradient(circle at 70% 10%,rgba(25,150,107,.18),transparent 30%),#090b12'}}>
    <div className="panel form-card" style={{width:'min(430px,94vw)'}}>
      <div className="center"><div className="brand-mark" style={{margin:'0 auto 10px'}}>R</div><h1 style={{fontSize:18,marginBottom:4}}>Welcome back</h1><p className="muted" style={{fontSize:8}}>Sign in to continue to your rewards account.</p></div>
      <div className="form-grid mt">
        <div className="field"><label>Email</label><input type="email" placeholder="you@example.com"/></div>
        <div className="field"><label>Password</label><input type="password" placeholder="••••••••"/></div>
        <button className="primary-button" style={{padding:10}}>Sign in</button>
      </div>
      <p className="center muted" style={{fontSize:8}}>No account? <Link href="/register" style={{color:'#5baeff'}}>Create one</Link></p>
    </div>
  </div>;
}