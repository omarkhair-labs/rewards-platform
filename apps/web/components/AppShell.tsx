'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Bell,
  Boxes,
  ClipboardCheck,
  CircleDollarSign,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { apiFetch, clearToken, formatPoints, getToken } from '@/lib/api';
import type { Me } from '@/lib/types';

const nav = [
  { href:'/dashboard', label:'Dashboard', icon:LayoutDashboard },
  { href:'/offers', label:'Offers', icon:Boxes },
  { href:'/surveys', label:'Surveys', icon:ClipboardCheck },
  { href:'/tasks', label:'Tasks', icon:ListTodo },
  { href:'/affiliates', label:'Affiliates', icon:UsersRound },
  { href:'/cashout', label:'Cashout', icon:CircleDollarSign },
  { href:'/profile', label:'Profile', icon:UserRound }
];

const mobileNav = [
  { href:'/tasks', label:'Tasks', icon:ListTodo },
  { href:'/cashout', label:'Cashout', icon:CircleDollarSign },
  { href:'/dashboard', label:'Earn', icon:BadgeDollarSign },
  { href:'/surveys', label:'Surveys', icon:ClipboardCheck },
  { href:'/profile', label:'Profile', icon:UserRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me,setMe] = useState<Me|null>(null);
  const [loading,setLoading] = useState(true);
  const [sidebarOpen,setSidebarOpen] = useState(false);

  useEffect(()=>{
    let active = true;

    async function load(){
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      try {
        const user = await apiFetch<Me>('/api/auth/me');
        if (active) setMe(user);
      } catch {
        clearToken();
        router.replace('/login');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return ()=>{ active=false; };
  },[router]);

  useEffect(()=>setSidebarOpen(false),[pathname]);

  function logout(){
    clearToken();
    router.replace('/login');
  }

  const username = me?.username || 'Member';
  const initial = username.slice(0,1).toUpperCase();
  const rank = me?.rank || 'Bronze';
  const level = me?.level || 1;
  const isPremium = Boolean(me?.is_premium);
  const balance = formatPoints(me?.available_points || 0);
  const activeLabel = nav.find(n=>n.href===pathname)?.label || 'Rewards';

  if (loading || !me) {
    return <div className="app-boot">
      <div className="brand-mark">R</div>
      <div className="loading-spinner" />
      <span>Loading your rewards account...</span>
    </div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <button className="chrome-button" aria-label={sidebarOpen?'Close menu':'Open menu'} aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(v=>!v)}>
            {sidebarOpen?<X size={22}/>:<Menu size={22}/>}
          </button>
          <Link className="brand" href="/dashboard" aria-label="Rewards dashboard">
            <span className="brand-mark">R</span>
            <span className="brand-copy"><strong>Rewards</strong><small>Member Portal</small></span>
          </Link>
        </div>
        <div className="top-actions">
          <Link className="wallet-chip" href="/cashout" aria-label={`${balance} coins available`}><span>🪙</span><b>{balance}</b></Link>
          <button className="chrome-button" aria-label="Notifications"><Bell size={20}/></button>
          <Link className="chrome-button" aria-label="Profile" href="/profile"><UserRound size={21}/></Link>
        </div>
      </header>

      <aside className={'sidebar '+(sidebarOpen?'open':'')}>
        <div className="member-card">
          <div className="avatar">{initial}</div>
          <div className="member-copy">
            <b>{username}</b>
            <span>{rank} · Level {level} · {balance} Coins</span>
          </div>
          <span className="premium-pill">{isPremium ? 'PREMIUM' : 'MEMBER'}</span>
          <div className="member-progress" aria-hidden="true"><span style={{width:`${Math.min(100,Math.max(8,level*8))}%`}} /></div>
          <small className="member-progress-label">Keep earning to reach the next level</small>
        </div>

        <nav className="side-nav" aria-label="Member navigation">
          {nav.filter(item=>item.href!=='/profile').map(({href,label,icon:Icon}) => (
            <Link key={href} href={href} className={pathname===href ? 'active' : ''}>
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link className="affiliate-box" href="/affiliates">
            <BadgeDollarSign size={22} />
            <div><b>Affiliate Program</b><span>Invite friends and earn from eligible rewards.</span><em>View Affiliate Program</em></div>
          </Link>
          <Link className="ghost-button" href="/profile"><Settings size={16}/> Settings</Link>
          <button className="ghost-button" onClick={logout}><LogOut size={16}/> Logout</button>
        </div>
      </aside>
      {sidebarOpen&&<button className="sidebar-scrim" aria-label="Close navigation" onClick={()=>setSidebarOpen(false)} />}

      <main className="main-stage">
        <div className="page-kicker"><span>{activeLabel}</span><span className="live-dot">Member area</span></div>
        <div className="page-wrap">{children}</div>
      </main>

      <nav className="mobile-nav" aria-label="Quick navigation">
        {mobileNav.map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?'active':''}><Icon size={21}/><span>{label}</span></Link>)}
      </nav>
    </div>
  );
}
