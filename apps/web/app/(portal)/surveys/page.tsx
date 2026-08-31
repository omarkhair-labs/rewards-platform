'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ErrorPanel, LoadingPanel } from '@/components/LoadingPanel';

type SurveyProfile={
  birth_year?:number|null;
  gender?:string|null;
  postal_code?:string|null;
  country_code?:string|null;
  answers?:Record<string,unknown>;
};

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
      const [p,ps]=await Promise.all([
        apiFetch<SurveyProfile|null>('/api/surveys/profile'),
        apiFetch<SurveyProvider[]>('/api/surveys/providers')
      ]);
      setProfile(p);
      setProviders(ps);
      if(p){
        setBirthYear(p.birth_year?String(p.birth_year):'');
        setGender(p.gender||'');
        setPostalCode(p.postal_code||'');
        setCountryCode(p.country_code||'EG');
      }
    }catch(err){setError(err instanceof Error?err.message:'Failed to load surveys');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    try{
      const next=await apiFetch<SurveyProfile>('/api/surveys/profile',{
        method:'PUT',
        body:JSON.stringify({
          birthYear:birthYear?Number(birthYear):undefined,
          gender:gender||undefined,
          postalCode:postalCode||undefined,
          countryCode:countryCode||undefined,
          answers:{}
        })
      });
      setProfile(next);
    }catch(err){setError(err instanceof Error?err.message:'Failed to save survey profile');}
    finally{setSaving(false);}
  }

  async function loadCpx(){
    setError('');
    try{
      const result=await apiFetch<{surveys?:CpxSurvey[]}>('/api/integrations/cpx/surveys');
      setSurveys(result.surveys||[]);
    }catch(err){setError(err instanceof Error?err.message:'Unable to load CPX surveys');}
  }

  async function openCpxWall(){
    try{
      const result=await apiFetch<{url:string}>('/api/integrations/cpx/wall');
      window.open(result.url,'_blank','noopener,noreferrer');
    }catch(err){setError(err instanceof Error?err.message:'Unable to open CPX');}
  }

  async function openTheoremReach(){
    try{
      const result=await apiFetch<{url:string}>('/api/integrations/theoremreach/entry');
      window.open(result.url,'_blank','noopener,noreferrer');
    }catch(err){setError(err instanceof Error?err.message:'Unable to open TheoremReach');}
  }

  if(loading)return <LoadingPanel label="Loading survey center..." />;
  if(error&&!profile&&!providers.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <section className="hero-title"><h1>Survey Center</h1><p>Complete your demographic profile so survey partners can match eligible research without asking the same basics repeatedly.</p></section>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}

    <div className="split">
      <form className="panel" onSubmit={save}>
        <h2 style={{fontSize:12,marginTop:0}}>Survey profile</h2>
        <div className="form-grid">
          <div className="field"><label>Birth year</label><input type="number" min="1900" max={new Date().getFullYear()-13} value={birthYear} onChange={e=>setBirthYear(e.target.value)} placeholder="2000"/></div>
          <div className="field"><label>Gender</label><select value={gender} onChange={e=>setGender(e.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></div>
          <div className="field"><label>ZIP / Postal code</label><input value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="Postal code"/></div>
          <div className="field"><label>Country code</label><input value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())} maxLength={3} placeholder="EG"/></div>
          <button disabled={saving} className="primary-button" style={{padding:9}}>{saving?'Saving...':'Save profile'}</button>
        </div>
      </form>

      <div className="panel">
        <h2 style={{fontSize:12,marginTop:0}}>Survey providers</h2>
        {providers.length?providers.map(p=><div className="stat-card" key={p.id} style={{marginBottom:8}}>
          <span>{p.slug}</span><strong style={{fontSize:11}}>{p.name}</strong>
          <div style={{display:'flex',gap:6,marginTop:8}}>
            {p.slug==='cpx'&&<><button className="secondary-button" onClick={()=>void loadCpx()}>Load surveys</button><button className="primary-button" onClick={()=>void openCpxWall()}>Open wall</button></>}
            {p.slug==='theoremreach'&&<button className="primary-button" onClick={()=>void openTheoremReach()}>Open survey wall</button>}
            {!['cpx','theoremreach'].includes(p.slug)&&<span className="muted" style={{fontSize:7}}>Provider enabled</span>}
          </div>
        </div>):<div className="muted" style={{fontSize:8}}>No survey providers are enabled yet.</div>}
      </div>
    </div>

    <div className="section-heading"><h2>Available Surveys</h2><span>{surveys.length} loaded</span></div>
    {surveys.length?<div className="offer-grid">
      {surveys.map(s=><div className={'offer-card '+(s.top?'featured':'')} key={s.id}>
        {s.top? <span className="offer-badge">TOP</span>:null}
        <div className="offer-art">S</div>
        <h3>Survey #{s.id}</h3>
        <p>{s.loi ? String(s.loi)+' min · ' : ''}CPX Research</p>
        <div className="offer-footer"><span className="reward">{s.payout??'—'} reward</span><button className="primary-button" onClick={()=>window.open(s.href_new||s.href||'#','_blank','noopener,noreferrer')}>Start</button></div>
      </div>)}
    </div>:<div className="panel center muted" style={{padding:34,fontSize:8}}>Load surveys from an enabled provider to see current matches.</div>}
  </>;
}
