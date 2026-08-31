'use client';

import { useState } from 'react';

export default function SurveysPage(){
  const [completed,setCompleted]=useState(false);
  return <>
    <section className="hero-title"><h1>Survey Center</h1><p>Complete your demographic profile first so survey partners can match the right opportunities.</p></section>
    {!completed ? <div className="panel form-card">
      <h2 style={{fontSize:13,marginTop:0}}>Complete your profile</h2>
      <p className="muted" style={{fontSize:8}}>This information is used only to match you with eligible research.</p>
      <div className="form-grid">
        <div className="field"><label>Age</label><input type="number" placeholder="Enter your age"/></div>
        <div className="field"><label>Gender</label><select><option>Select gender</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></div>
        <div className="field"><label>ZIP / Postal code</label><input placeholder="Postal code"/></div>
        <div className="field"><label>Country</label><select><option>Egypt</option><option>United States</option><option>United Kingdom</option></select></div>
        <button className="primary-button" style={{padding:9}} onClick={()=>setCompleted(true)}>Continue to surveys</button>
      </div>
    </div> : <>
      <div className="toolbar"><div className="filters"><button className="filter active">All</button><button className="filter">Best match</button><button className="filter">Highest reward</button></div><button className="secondary-button" onClick={()=>setCompleted(false)}>Edit profile</button></div>
      <div className="panel center" style={{padding:40}}>
        <strong style={{fontSize:13}}>No surveys found</strong>
        <p className="muted" style={{fontSize:8}}>New surveys appear throughout the day. Check again shortly.</p>
      </div>
    </>}
  </>;
}