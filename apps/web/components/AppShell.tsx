'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  Boxes,
  ClipboardCheck,
  CircleDollarSign,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  MessageCircle,
  Send,
  Settings,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { apiFetch, clearToken, formatPoints, getToken } from '@/lib/api';
import type { Me, Notification } from '@/lib/types';

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
  const [notificationsOpen,setNotificationsOpen] = useState(false);
  const [accountOpen,setAccountOpen] = useState(false);
  const [walletOpen,setWalletOpen] = useState(false);
  const [supportOpen,setSupportOpen] = useState(false);
  const [supportInput,setSupportInput] = useState('');
  const [supportMessages,setSupportMessages] = useState([{id:'welcome',from:'support',text:'Hi! How can we help with your rewards account today?'}]);
  const [notifications,setNotifications] = useState<Notification[]>([]);

  useEffect(()=>{
    let active = true;

    async function load(){
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      try {
        const [user,items] = await Promise.all([
          apiFetch<Me>('/api/auth/me'),
          apiFetch<Notification[]>('/api/account/notifications').catch(()=>[])
        ]);
        if (active) { setMe(user); setNotifications(items); }
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

  useEffect(()=>{setSidebarOpen(false);setNotificationsOpen(false);setAccountOpen(false);setWalletOpen(false);},[pathname]);

  function logout(){
    clearToken();
    router.replace('/login');
  }

  async function markRead(item:Notification){
    if(item.read_at)return;
    await apiFetch(`/api/account/notifications/${item.id}/read`,{method:'PATCH'});
    setNotifications(current=>current.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row));
  }

  function sendSupportMessage(event:FormEvent){
    event.preventDefault();
    const text=supportInput.trim();
    if(!text)return;
    setSupportMessages(current=>[...current,{id:`member-${Date.now()}`,from:'member',text},{id:`support-${Date.now()}`,from:'support',text:'Thanks — your message is in the demo support queue.'}]);
    setSupportInput('');
  }

  const username = me?.username || 'Member';
  const initial = username.slice(0,1).toUpperCase();
  const rank = me?.rank || 'Bronze';
  const level = me?.level || 1;
  const isPremium = Boolean(me?.is_premium);
  const balance = formatPoints(me?.available_points || 0);
  const activeLabel = nav.find(n=>n.href===pathname)?.label || 'Rewards';
  const unread = notifications.filter(item=>!item.read_at).length;

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
          <button className="wallet-chip" aria-label={`${balance} coins available. Open wallet.`} aria-expanded={walletOpen} onClick={()=>{setWalletOpen(v=>!v);setNotificationsOpen(false);setAccountOpen(false);}}><span>🪙</span><b>{balance}</b></button>
          <button className="chrome-button notification-trigger" aria-label={`Notifications${unread?` (${unread} unread)`:''}`} aria-expanded={notificationsOpen} onClick={()=>{setNotificationsOpen(v=>!v);setAccountOpen(false);setWalletOpen(false);}}><Bell size={20}/>{unread>0&&<span className="notification-count">{unread}</span>}</button>
          <button className="chrome-button" aria-label="Account menu" aria-expanded={accountOpen} onClick={()=>{setAccountOpen(v=>!v);setNotificationsOpen(false);setWalletOpen(false);}}><UserRound size={21}/></button>
        </div>
      </header>

      {(notificationsOpen||accountOpen||walletOpen)&&<button className="popover-scrim" aria-label="Close open menu" onClick={()=>{setNotificationsOpen(false);setAccountOpen(false);setWalletOpen(false);}} />}

      {walletOpen&&<section className="top-popover wallet-popover" aria-label="Wallet summary">
        <div className="popover-head"><div><b>My Wallet</b><span>Live account balance</span></div><span className="status-pill available">Available</span></div>
        <div className="wallet-popover-grid">
          <div><span>Available</span><b>{balance}</b><small>Coins ready to use</small></div>
          <div><span>Held</span><b>{formatPoints(me.held_points||0)}</b><small>Cashouts in review</small></div>
          <div><span>Lifetime earned</span><b>{formatPoints(me.lifetime_earned_points||0)}</b><small>All credited rewards</small></div>
        </div>
        {Number(me.debt_points||0)>0&&<div className="wallet-warning">Cashout is locked until {formatPoints(me.debt_points)} debt Coins are settled.</div>}
        <div className="wallet-popover-actions"><Link className="secondary-button" href="/profile">View history</Link><Link className="primary-button" href="/cashout">Cashout <ArrowRight size={14}/></Link></div>
      </section>}

      {notificationsOpen&&<section className="top-popover notification-popover" aria-label="Notifications">
        <div className="popover-head"><div><b>Notifications</b><span>{unread} unread</span></div>{unread>0&&<button onClick={()=>void Promise.all(notifications.filter(n=>!n.read_at).map(markRead))}>Mark all read</button>}</div>
        <div className="notification-list">{notifications.length?notifications.map(item=><button key={item.id} className={'notification-item '+(!item.read_at?'unread':'')} onClick={()=>void markRead(item)}><span className="notification-dot"/><span><b>{item.title}</b><small>{item.message}</small><time>{new Date(item.created_at).toLocaleDateString()}</time></span></button>):<div className="popover-empty">You are all caught up.</div>}</div>
      </section>}

      {accountOpen&&<section className="top-popover account-popover" aria-label="Account menu">
        <div className="account-summary"><span className="avatar">{initial}</span><span><b>{username}</b><small>{me.email}</small></span></div>
        <Link href="/profile"><UserRound size={16}/> View profile</Link>
        <Link href="/profile"><Settings size={16}/> Account settings</Link>
        <button onClick={logout}><LogOut size={16}/> Logout</button>
      </section>}

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

      <button className="support-trigger" aria-label={supportOpen?'Close live support':'Open live support'} aria-expanded={supportOpen} onClick={()=>setSupportOpen(value=>!value)}>{supportOpen?<X size={22}/>:<MessageCircle size={22}/>}</button>
      {supportOpen&&<section className="support-drawer" role="dialog" aria-modal="false" aria-label="Live support">
        <div className="support-head"><div><b>Live Support</b><span><i/> Online · typically replies quickly</span></div><button aria-label="Close support" onClick={()=>setSupportOpen(false)}><X size={18}/></button></div>
        <div className="support-messages">{supportMessages.map(message=><div key={message.id} className={`support-message ${message.from}`}>{message.text}</div>)}</div>
        <div className="support-quick"><button onClick={()=>setSupportInput('I need help with a cashout')}>Cashout help</button><button onClick={()=>setSupportInput('I need help with a task proof')}>Task proof</button></div>
        <form className="support-composer" onSubmit={sendSupportMessage}><label className="sr-only" htmlFor="support-message">Message support</label><input id="support-message" value={supportInput} onChange={event=>setSupportInput(event.target.value)} maxLength={200} placeholder="Type your message..."/><button aria-label="Send message"><Send size={17}/></button></form>
      </section>}
    </div>
  );
}
