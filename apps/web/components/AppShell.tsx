'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeDollarSign, Boxes, ClipboardCheck, CircleDollarSign, LayoutDashboard,
  ListTodo, LogOut, Settings, ShieldCheck, UserRound, UsersRound
} from 'lucide-react';

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
          <div className="avatar">M</div>
          <div className="member-copy">
            <b>Mostafa</b>
            <span>Bronze Member</span>
          </div>
          <span className="premium-pill">FREE</span>
        </div>

        <div className="side-balance">
          <span>Balance</span>
          <strong>0 Coins</strong>
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
          <div className="affiliate-box">
            <BadgeDollarSign size={17} />
            <div><b>Affiliate Program</b><span>Earn from referrals</span></div>
          </div>
          <button className="ghost-button"><Settings size={15}/> Settings</button>
          <button className="ghost-button"><LogOut size={15}/> Logout</button>
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
            <button className="icon-button" aria-label="settings"><Settings size={16}/></button>
            <div className="mini-avatar">M</div>
          </div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
