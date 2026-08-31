'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BadgeDollarSign, Boxes, ClipboardCheck, CircleDollarSign, LayoutDashboard,
  ListTodo, LogOut, Settings, ShieldCheck, UserRound, UsersRound
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me,setMe] = useState<Me|null>(null);
  const [loading,setLoading] = useState(true);

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

  if (loading || !me) {
    return <div className="app-boot">
      <div className="brand-mark">R</div>
      <div className="loading-spinner" />
      <span>Loading your rewards account...</span>
    </div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>Rewards</strong>
            <span>Member Portal</span>
          </div>
        </div>

        <div className="member-card">
          <div className="avatar">{initial}</div>
          <div className="member-copy">
            <b>{username}</b>
            <span>{rank} · Level {level}</span>
          </div>
          <span className="premium-pill">{isPremium ? 'PREMIUM' : 'FREE'}</span>
        </div>

        <div className="side-balance">
          <span>Balance</span>
          <strong>{balance} Coins</strong>
        </div>

        <nav className="side-nav">
          {nav.map(({href,label,icon:Icon}) => (
            <Link key={href} href={href} className={pathname===href ? 'active' : ''}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link className="affiliate-box" href="/affiliates">
            <BadgeDollarSign size={17} />
            <div><b>Affiliate Program</b><span>Earn from referrals</span></div>
          </Link>
          <Link className="ghost-button" href="/profile"><Settings size={15}/> Settings</Link>
          <button className="ghost-button" onClick={logout}><LogOut size={15}/> Logout</button>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar">
          <div>
            <span className="eyebrow">REWARDS CENTER</span>
            <strong>{nav.find(n=>n.href===pathname)?.label || 'Dashboard'}</strong>
          </div>
          <div className="top-actions">
            <div className="security-chip"><ShieldCheck size={15}/> Secure account</div>
            <Link className="icon-button icon-link" aria-label="settings" href="/profile"><Settings size={16}/></Link>
            <div className="mini-avatar">{initial}</div>
          </div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
