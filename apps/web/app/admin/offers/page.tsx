'use client';

import { FormEvent,useCallback,useEffect,useState } from 'react';
import { apiFetch,formatPoints } from '@/lib/api';
import type { AdminOffer,AdminProvider } from '@/lib/admin-types';
import { ErrorPanel,LoadingPanel } from '@/components/LoadingPanel';

type FormState={
  title:string;description:string;category:string;rewardPoints:string;providerId:string;landingUrl:string;
  difficulty:string;estimatedMinutes:string;isFeatured:boolean;isActive:boolean;
};

const emptyForm:FormState={title:'',description:'',category:'General',rewardPoints:'0',providerId:'',landingUrl:'',difficulty:'Easy',estimatedMinutes:'',isFeatured:false,isActive:true};

export default function OffersAdmin(){
  const [offers,setOffers]=useState<AdminOffer[]>([]);
  const [providers,setProviders]=useState<AdminProvider[]>([]);
  const [selected,setSelected]=useState<AdminOffer|null>(null);
  const [form,setForm]=useState<FormState>(emptyForm);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setError('');
    try{
      const [o,p]=await Promise.all([apiFetch<AdminOffer[]>('/api/admin/offers'),apiFetch<AdminProvider[]>('/api/admin/providers')]);
      setOffers(o);setProviders(p);
    }catch(err){setError(err instanceof Error?err.message:'Failed to load offers');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  function open(offer?:AdminOffer){
    if(offer){
      setSelected(offer);
      setForm({
        title:offer.title,description:offer.description||'',category:offer.category,rewardPoints:String(offer.reward_points),
        providerId:offer.provider_id?String(offer.provider_id):'',landingUrl:offer.landing_url||'',difficulty:offer.difficulty||'',
        estimatedMinutes:offer.estimated_minutes?String(offer.estimated_minutes):'',isFeatured:Boolean(offer.is_featured),isActive:Boolean(offer.is_active)
      });
    }else{
      setSelected(null);setForm(emptyForm);
    }
  }

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);setError('');
    const body={
      title:form.title,description:form.description,category:form.category,rewardPoints:form.rewardPoints,
      providerId:form.providerId||null,landingUrl:form.landingUrl||null,difficulty:form.difficulty||null,
      estimatedMinutes:form.estimatedMinutes?Number(form.estimatedMinutes):null,isFeatured:form.isFeatured,isActive:form.isActive
    };
    try{
      if(selected)await apiFetch('/api/admin/offers/'+selected.id,{method:'PATCH',body:JSON.stringify(body)});
      else await apiFetch('/api/admin/offers',{method:'POST',body:JSON.stringify(body)});
      setSelected(null);setForm(emptyForm);await load();
    }catch(err){setError(err instanceof Error?err.message:'Failed to save offer');}
    finally{setSaving(false);}
  }

  async function toggle(offer:AdminOffer,key:'isActive'|'isFeatured'){
    const body=key==='isActive'?{isActive:!offer.is_active}:{isFeatured:!offer.is_featured};
    try{await apiFetch('/api/admin/offers/'+offer.id,{method:'PATCH',body:JSON.stringify(body)});await load();}
    catch(err){setError(err instanceof Error?err.message:'Failed to update offer');}
  }

  if(loading)return <LoadingPanel label="Loading offers..." />;
  if(error&&!offers.length&&!providers.length)return <ErrorPanel message={error} retry={()=>void load()}/>;

  return <>
    <div className="admin-toolbar">
      <div className="admin-title"><h1>Offers</h1><p>Curated offers, provider mapping, reward values and visibility.</p></div>
      <button className="primary-button" onClick={()=>open()}>New Offer</button>
    </div>
    {error&&<div className="notice" style={{borderColor:'rgba(255,90,126,.4)',color:'#ff9bb5'}}>{error}</div>}
    <div className="panel"><table className="table"><thead><tr><th>Offer</th><th>Provider</th><th>Category</th><th>Reward</th><th>Featured</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{offers.length?offers.map(o=><tr key={o.id}><td><b>{o.title}</b><br/><span className="muted">{o.external_id||'Internal'}</span></td><td>{o.provider_name||o.provider_slug||'Manual'}</td><td>{o.category}</td><td>{formatPoints(o.reward_points)}</td><td>{o.is_featured?'Yes':'No'}</td><td><span className={'status-pill '+(o.is_active?'available':'review')}>{o.is_active?'active':'disabled'}</span></td><td><div className="admin-actions"><button className="secondary-button" onClick={()=>open(o)}>Edit</button><button className="secondary-button" onClick={()=>void toggle(o,'isFeatured')}>{o.is_featured?'Unfeature':'Feature'}</button><button className={o.is_active?'danger-button':'success-button'} onClick={()=>void toggle(o,'isActive')}>{o.is_active?'Disable':'Enable'}</button></div></td></tr>):<tr><td colSpan={7} className="admin-empty">No offers configured.</td></tr>}</tbody>
    </table></div>

    {(selected!==null||form!==emptyForm)&&<div className="modal-backdrop" onClick={()=>{setSelected(null);setForm(emptyForm);}}><form className="modal" onSubmit={save} onClick={e=>e.stopPropagation()}>
      <h2>{selected?'Edit Offer':'Create Offer'}</h2>
      <div className="form-grid">
        <div className="field"><label>Title</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div className="split">
          <div className="field"><label>Category</label><input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div>
          <div className="field"><label>Reward Points</label><input required inputMode="numeric" value={form.rewardPoints} onChange={e=>setForm({...form,rewardPoints:e.target.value.replace(/\D/g,'')})}/></div>
        </div>
        <div className="field"><label>Provider</label><select value={form.providerId} onChange={e=>setForm({...form,providerId:e.target.value})}><option value="">Manual / none</option>{providers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="field"><label>Landing URL</label><input value={form.landingUrl} onChange={e=>setForm({...form,landingUrl:e.target.value})} placeholder="https://..."/></div>
        <div className="split">
          <div className="field"><label>Difficulty</label><input value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}/></div>
          <div className="field"><label>Estimated Minutes</label><input inputMode="numeric" value={form.estimatedMinutes} onChange={e=>setForm({...form,estimatedMinutes:e.target.value.replace(/\D/g,'')})}/></div>
        </div>
        <label style={{fontSize:8}}><input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/> Featured</label>
        <label style={{fontSize:8}}><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active</label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setSelected(null);setForm(emptyForm);}}>Cancel</button><button disabled={saving} className="primary-button">{saving?'Saving...':'Save Offer'}</button></div>
    </form></div>}
  </>;
}
