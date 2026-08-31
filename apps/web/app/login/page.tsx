'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken, setToken } from '@/lib/api';

type LoginResponse = {
  token: string;
  user: { id:string; username:string; email:string; role:string };
};

export default function LoginPage(){
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if (getToken()) router.replace('/dashboard');
  },[router]);

  async function submit(e:FormEvent){
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      const result = await apiFetch<LoginResponse>('/api/auth/login',{
        method:'POST',
        auth:false,
        body:JSON.stringify({email,password})
      });
      setToken(result.token);
      router.replace('/dashboard');
    }catch(err){
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    }finally{
      setLoading(false);
    }
  }

  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'radial-gradient(circle at 70% 10%,rgba(25,150,107,.18),transparent 30%),#090b12'}}>
    <form className="panel form-card" style={{width:'min(430px,94vw)'}} onSubmit={submit}>
      <div className="center"><div className="brand-mark" style={{margin:'0 auto 10px'}}>R</div><h1 style={{fontSize:18,marginBottom:4}}>Welcome back</h1><p className="muted" style={{fontSize:8}}>Sign in to continue to your rewards account.</p></div>
      {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',background:'rgba(120,20,55,.16)',color:'#ff9bb5'}}>{error}</div>}
      <div className="form-grid mt">
        <div className="field"><label>Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div>
        <div className="field"><label>Password</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"/></div>
        <button disabled={loading} className="primary-button" style={{padding:10}}>{loading?'Signing in...':'Sign in'}</button>
      </div>
      <p className="center muted" style={{fontSize:8}}>No account? <Link href="/register" style={{color:'#5baeff'}}>Create one</Link></p>
    </form>
  </div>;
}
