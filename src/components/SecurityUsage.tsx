import React, { useEffect, useState } from 'react';
import { Card, Button, T, body } from './ui';
import { supabase } from '../lib/supabase';
import { colors as c, fonts as f } from '../lib/theme';
type Usage = { jobs: { job: string; attempts: number }[]; transcript_bytes: number; storage_cap_bytes: number; new_applications_today: number; application_daily_cap: number };
export function SecurityUsage() {
 const [usage,setUsage]=useState<Usage|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);setError('');try{if(!supabase)throw Error();const {data,error:problem}=await supabase.rpc('security_usage');if(problem)throw Error();setUsage(data);}catch{setError('Usage could not load. Owner access is required; wait a moment before retrying.');}finally{setBusy(false);}}
 useEffect(()=>{let active=true;void supabase?.rpc('security_usage').then(({data,error:problem})=>{if(active){if(problem)setError('Usage unavailable.');else setUsage(data);}});return()=>{active=false;};},[]);
 return <Card style={{padding:22,gap:14}}><T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:21}}>Capacity & cost controls</T>{usage&&<><T style={body}>Transcript storage: {(usage.transcript_bytes/1048576).toFixed(1)} / {(usage.storage_cap_bytes/1048576).toFixed(0)} MiB. New applications today: {usage.new_applications_today} / {usage.application_daily_cap}.</T><T style={body}>Instagram attempts today (UTC): {usage.jobs.find(job=>job.job==='instagram')?.attempts??0} / 6. Maximum provider charge per attempt: US$0.05. Calendar attempts: {usage.jobs.find(job=>job.job==='calendar')?.attempts??0} / 6. At least one hour between attempts within each UTC day.</T></>}<T style={body}>These are app limits, not your provider invoice. Supabase, hosting, email delivery, storage and other account charges require their own billing limits and alerts. Failed imports consume an attempt so repeated failures cannot run up the scraping budget.</T>{!!error&&<T accessibilityRole="alert" style={{color:c.error}}>{error}</T>}<Button secondary label="Refresh capacity" loading={busy} onPress={()=>{void load();}} /></Card>;
}
