'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity, BadgeDollarSign, Boxes, ClipboardCheck, FileCheck2, Gauge,
  ListTodo, LogOut, ShieldAlert, SlidersHorizontal, UsersRound, Crown, PlayCircle
} from 'lucide-react';
import { apiFetch, clearToken, getToken } from '@/lib/api';
import type { Me } from '@/lib/types';

const nav = [
  {href:'/admin',label:'Overview',icon:Gauge},
  {href:'/admin/users',label:'Users',icon:UsersRound},
  {href:'/admin/offers',label:'Offers',icon:Boxes},
  {href:'/admin/tasks',label:'Tasks',icon:ListTodo},
  {href:'/admin/proofs',label:'Proof Review',icon:FileCheck2},
  {href:'/admin/withdrawals',label:'Withdrawals',icon:BadgeDollarSign},
  {href:'/admin/providers',label:'Providers',icon:SlidersHorizontal},
  {href:'/admin/watch',label:'Watch & Earn',icon:PlayCircle},
  {href:'/admin/settings',label:'Levels & Premium',icon:Crown},
  {href:'/admin/fraud',label:'Fraud',icon:ShieldAlert},
  {href:'/admin/audit',label:'Audit Log',icon:Activity}
];

export function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [me,setMe]=useState<Me|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    async function load(){
      if(!getToken()){router.replace('/login');return;}
      try{
        const user=await apiFetch<Me>('/api/auth/me');
        if(!['admin','moderator'].includes(user.role)){
          router.replace('/dashboard');
          return;
        }
        if(active)setMe(user);
      }catch{
        clearToken();
        router.replace('/login');
      }finally{
        if(active)setLoading(false);
      }
    }
    void load();
    return()=>{active=false;};
  },[router]);

  if(loading||!me){
    return <div className="app-boot"><div className="brand-mark">A</div><div className="loading-spinner"/><span>Loading operations console...</span></div>;
  }

  const current=nav.find(n=>n.href===pathname)?.label || 'Operations Console';

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div><strong>Rewards Admin</strong><span>Operations Console</span></div>
      </div>
      <div className="admin-operator">
        <b>{me.username}</b>
        <span>{me.role.toUpperCase()}</span>
      </div>
      <nav className="admin-nav">
        {nav.map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?'active':''}><Icon size={16}/><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom">
        <Link className="ghost-button" href="/dashboard"><ClipboardCheck size={15}/> Member Portal</Link>
        <button className="ghost-button" onClick={()=>{clearToken();router.replace('/login');}}><LogOut size={15}/> Logout</button>
      </div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar">
        <div><span className="eyebrow">OPERATIONS</span><strong>{current}</strong></div>
        <div className="security-chip">Role: {me.role}</div>
      </header>
      <div className="admin-page">{children}</div>
    </main>
  </div>;
}
