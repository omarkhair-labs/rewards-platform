'use client';

import { useCallback,useEffect,useMemo,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

type WatchCampaign={
  id:string;
  title:string;
  media_url:string;
  duration_seconds:number;
  reward_points:string|number;
  daily_limit:number;
};

type ActiveSession={
  campaignId:string;
  sessionId:string;
  endsAt:number;
  durationSeconds:number;
  mediaUrl:string;
};

export default function WatchPage(){
  const [campaigns,setCampaigns]=useState<WatchCampaign[]>([]);
  const [active,setActive]=useState<ActiveSession|null>(null);
  const [now,setNow]=useState(Date.now());
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [success,setSuccess]=useState('');

  const load=useCallback(async()=>{
    setError('');
    try{setCampaigns(await apiFetch<WatchCampaign[]>('/api/watch'));}
    catch(err){setError(err instanceof Error?err.message:'Failed to load watch campaigns');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  useEffect(()=>{
    if(!active)return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>window.clearInterval(timer);
  },[active]);

  const remaining=useMemo(()=>active?Math.max(0,Math.ceil((active.endsAt-now)/1000)):0,[active,now]);

  async function start(campaign:WatchCampaign){
    setWorking(true);setError('');setSuccess('');
    try{
      const result=await apiFetch<{sessionId:string;minimumSeconds:number}>('/api/watch/'+campaign.id+'/start',{method:'POST'});
      setActive({campaignId:campaign.id,sessionId:result.sessionId,endsAt:Date.now()+result.minimumSeconds*1000,durationSeconds:result.minimumSeconds,mediaUrl:campaign.media_url});
      setNow(Date.now());
      window.open(campaign.media_url,'_blank','noopener,noreferrer');
    }catch(err){setError(err instanceof Error?err.message:'Unable to start campaign');}
    finally{setWorking(false);}
  }

  async function complete(){
    if(!active||remaining>0)return;
    setWorking(true);setError('');setSuccess('');
    try{
      await apiFetch('/api/watch/sessions/'+active.sessionId+'/complete',{method:'POST'});
      setSuccess('Reward credited successfully.');
      setActive(null);
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Unable to complete watch session');}
    finally{setWorking(false);}
  }

  if(loading)return <LoadingPanel label="Loading Watch & Earn..." />;
  if(error&&!campaigns.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <section className="hero-title"><h1>Watch & Earn</h1><p>Open a campaign, keep the timed session active, then claim the reward after the minimum watch duration.</p></section>

    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    {success&&<div className="notice">{success}</div>}

    {active&&<div className="panel mt">
      <div className="section-heading"><h2>Active Watch Session</h2><span>{remaining>0?remaining+' seconds remaining':'Ready to complete'}</span></div>
      <div className="progress-track"><div className="progress-fill" style={{width:(remaining===0?100:Math.max(0,100-(remaining/Math.max(1,active.durationSeconds))*100))+'%'}}/></div>
      <div className="admin-actions mt">
        <a className="secondary-button" href={active.mediaUrl} target="_blank" rel="noreferrer">Reopen Media</a>
        <button disabled={working||remaining>0} className="primary-button" onClick={()=>void complete()}>{working?'Checking...':remaining>0?'Wait '+remaining+'s':'Claim Reward'}</button>
      </div>
    </div>}

    <div className="section-heading"><h2>Available Campaigns</h2><span>{campaigns.length} active</span></div>
    {campaigns.length?<div className="offer-grid">
      {campaigns.map(c=><div className="offer-card" key={c.id}>
        <div className="offer-art">▶</div>
        <h3>{c.title}</h3>
        <p>{c.duration_seconds}s minimum · {c.daily_limit} daily</p>
        <div className="offer-footer"><span className="reward">{formatPoints(c.reward_points)} Coins</span><button disabled={working||Boolean(active)} className="primary-button" onClick={()=>void start(c)}>Start</button></div>
      </div>)}
    </div>:<div className="panel center muted" style={{padding:34,fontSize:8}}>No active watch campaigns right now.</div>}
  </>;
}
