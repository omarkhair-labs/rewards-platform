'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, ExternalLink, UserRound } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

type SurveyProfile={birth_year?:number|null;gender?:string|null;postal_code?:string|null;country_code?:string|null;answers?:Record<string,unknown>};
type SurveyProvider={id:string|number;slug:string;name:string;wall_url?:string|null;public_config?:Record<string,unknown>};
type CpxSurvey={id:string;loi?:string|number;payout?:number|string;score?:string|number;href?:string;href_new?:string;top?:number};

export default function SurveysPage(){
  const [profile,setProfile]=useState<SurveyProfile|null>(null);
  const [providers,setProviders]=useState<SurveyProvider[]>([]);
  const [surveys,setSurveys]=useState<CpxSurvey[]>([]);
  const [birthYear,setBirthYear]=useState('');
  const [gender,setGender]=useState('');
  const [postalCode,setPostalCode]=useState('');
  const [countryCode,setCountryCode]=useState('EG');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setError('');
    try{
      const [p,ps]=await Promise.all([apiFetch<SurveyProfile|null>('/api/surveys/profile'),apiFetch<SurveyProvider[]>('/api/surveys/providers')]);
      setProfile(p);setProviders(ps);
      if(p){setBirthYear(p.birth_year?String(p.birth_year):'');setGender(p.gender||'');setPostalCode(p.postal_code||'');setCountryCode(p.country_code||'EG');}
    }catch(err){setError(err instanceof Error?err.message:'Failed to load surveys');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    try{
      const next=await apiFetch<SurveyProfile>('/api/surveys/profile',{method:'PUT',body:JSON.stringify({birthYear:birthYear?Number(birthYear):undefined,gender:gender||undefined,postalCode:postalCode||undefined,countryCode:countryCode||undefined,answers:{}})});
      setProfile(next);
    }catch(err){setError(err instanceof Error?err.message:'Failed to save survey profile');}
    finally{setSaving(false);}
  }

  async function loadCpx(){
    setError('');
    try{const result=await apiFetch<{surveys?:CpxSurvey[]}>('/api/integrations/cpx/surveys');setSurveys(result.surveys||[]);}
    catch(err){setError(err instanceof Error?err.message:'Unable to load CPX surveys');}
  }

  async function openCpxWall(){
    try{const result=await apiFetch<{url:string}>('/api/integrations/cpx/wall');window.open(result.url,'_blank','noopener,noreferrer');}
    catch(err){setError(err instanceof Error?err.message:'Unable to open CPX');}
  }

  async function openTheoremReach(){
    try{const result=await apiFetch<{url:string}>('/api/integrations/theoremreach/entry');window.open(result.url,'_blank','noopener,noreferrer');}
    catch(err){setError(err instanceof Error?err.message:'Unable to open TheoremReach');}
  }

  if(loading)return <LoadingPanel label="Loading survey center..." />;
  if(error&&!profile&&!providers.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  const complete=Boolean(profile?.birth_year&&profile?.gender&&profile?.postal_code);

  if(!complete)return <form className="panel survey-gate" onSubmit={save}>
    <div className="survey-gate-icon"><UserRound size={29}/></div>
    <span className="eyebrow">ONE QUICK STEP</span>
    <h1>Complete your profile</h1>
    <p>Tell us a little about yourself so we can show surveys that match your profile.</p>
    {error&&<div className="notice mt" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="form-grid mt">
      <div className="field"><label>Birth year</label><input required type="number" min="1900" max={new Date().getFullYear()-13} value={birthYear} onChange={e=>setBirthYear(e.target.value)} placeholder="Enter your birth year"/></div>
      <div className="field"><label>Gender</label><select required value={gender} onChange={e=>setGender(e.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></div>
      <div className="field"><label>ZIP / Postal code</label><input required value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="Enter your postal code"/></div>
      <div className="field"><label>Country code</label><input required value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())} maxLength={3} placeholder="EG"/></div>
      <button disabled={saving} className="primary-button">{saving?'Saving...':<>Continue to surveys <ArrowRight size={16}/></>}</button>
    </div>
  </form>;

  return <>
    <section className="hero-title"><h1>Premium Surveys</h1><p>Choose a trusted research provider and earn from surveys matched to your profile.</p><div className="hero-meta"><span className="live-dot">Profile ready</span><span className="hero-chip"><ClipboardCheck size={15}/> {providers.length} providers enabled</span></div></section>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="split">
      <div className="panel">
        <div className="profile-section-head"><div><h2>Your survey profile</h2><p>Used only to request eligible research matches.</p></div><span className="status-pill available">Complete</span></div>
        <div className="stats-grid">
          <div className="stat-card"><span>Birth year</span><strong style={{fontSize:20}}>{profile?.birth_year}</strong></div>
          <div className="stat-card"><span>Region</span><strong style={{fontSize:20}}>{profile?.country_code||'—'}</strong></div>
          <div className="stat-card"><span>Postal profile</span><strong style={{fontSize:20}}>Ready</strong></div>
          <div className="stat-card"><span>Matching</span><strong style={{fontSize:20}}>Active</strong></div>
        </div>
      </div>
      <div className="panel">
        <div className="profile-section-head"><div><h2>Survey providers</h2><p>Current connected research partners.</p></div></div>
        <div className="provider-stack">
          {providers.length?providers.map(p=><div className="provider-card" key={p.id}>
            <div className="provider-card-head"><div><small>{p.slug.toUpperCase()}</small><h3>{p.name}</h3></div><span className="live-dot">Enabled</span></div>
            <div className="provider-actions">
              {p.slug==='cpx'&&<><button className="secondary-button" onClick={()=>void loadCpx()}>Load surveys</button><button className="primary-button" onClick={()=>void openCpxWall()}>Open wall <ExternalLink size={14}/></button></>}
              {p.slug==='theoremreach'&&<button className="primary-button" onClick={()=>void openTheoremReach()}>Open survey wall <ExternalLink size={14}/></button>}
              {!['cpx','theoremreach'].includes(p.slug)&&<span className="muted" style={{fontSize:12}}>Provider enabled for eligible accounts.</span>}
            </div>
          </div>):<div className="empty-state"><b>No survey providers enabled</b><span>Providers will appear here when configured by an operator.</span></div>}
        </div>
      </div>
    </div>

    <div className="section-heading"><h2>Available Surveys</h2><span>{surveys.length} loaded</span></div>
    {surveys.length?<div className="offer-grid">
      {surveys.map(s=><article className={'offer-card '+(s.top?'featured':'')} key={s.id}>
        {s.top?<span className="offer-badge">TOP</span>:null}
        <div className="offer-art">S</div><h3>Survey #{s.id}</h3><p>{s.loi?String(s.loi)+' min · ':''}Research opportunity</p>
        <div className="offer-footer"><span className="reward">{s.payout??'—'} reward</span><button className="primary-button" onClick={()=>window.open(s.href_new||s.href||'#','_blank','noopener,noreferrer')}>Start <ExternalLink size={13}/></button></div>
      </article>)}
    </div>:<div className="panel empty-state"><b>No surveys loaded yet</b><span>Choose “Load surveys” from an enabled provider to fetch current matches.</span></div>}
  </>;
}
