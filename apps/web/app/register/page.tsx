'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, getToken, setToken } from '@/lib/api';

type RegisterResponse = {
  token: string;
  user: { id:string; username:string; email:string; role:string };
};

export default function RegisterPage(){
  const router = useRouter();
  const params = useSearchParams();
  const [username,setUsername]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [referralCode,setReferralCode]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if (getToken()) router.replace('/dashboard');
    const ref=params.get('ref');
    if(ref) setReferralCode(ref);
  },[router,params]);

  async function submit(e:FormEvent){
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      const body:{username:string;email:string;password:string;referralCode?:string}={username,email,password};
      if(referralCode.trim()) body.referralCode=referralCode.trim();
      const result=await apiFetch<RegisterResponse>('/api/auth/register',{
        method:'POST',
        auth:false,
        body:JSON.stringify(body)
      });
      setToken(result.token);
      router.replace('/dashboard');
    }catch(err){
      setError(err instanceof Error ? err.message : 'Unable to create account');
    }finally{
      setLoading(false);
    }
  }

  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'radial-gradient(circle at 70% 10%,rgba(25,150,107,.18),transparent 30%),#090b12'}}>
    <form className="panel form-card" style={{width:'min(460px,94vw)'}} onSubmit={submit}>
      <div className="center"><div className="brand-mark" style={{margin:'0 auto 10px'}}>R</div><h1 style={{fontSize:18,marginBottom:4}}>Create account</h1><p className="muted" style={{fontSize:8}}>Join the rewards platform and start earning.</p></div>
      {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',background:'rgba(120,20,55,.16)',color:'#ff9bb5'}}>{error}</div>}
      <div className="form-grid mt">
        <div className="field"><label>Username</label><input required minLength={3} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Choose a username" autoComplete="username"/></div>
        <div className="field"><label>Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div>
        <div className="field"><label>Password</label><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/></div>
        <div className="field"><label>Referral code (optional)</label><input value={referralCode} onChange={e=>setReferralCode(e.target.value)} placeholder="Referral code"/></div>
        <button disabled={loading} className="primary-button" style={{padding:10}}>{loading?'Creating account...':'Create account'}</button>
      </div>
      <p className="center muted" style={{fontSize:8}}>Already registered? <Link href="/login" style={{color:'#5baeff'}}>Sign in</Link></p>
    </form>
  </div>;
}
