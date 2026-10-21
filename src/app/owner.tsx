import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useOwner } from '../lib/use-owner';
import { ContentReport, ownerRequest, transcriptUrl, TutorApplication } from '../lib/tutoring';
import { Badge, Button, Card, Chips, Empty, PageHeading, Pill, T, body } from '../components/ui';
import { FormField } from '../components/FormField';
import { colors as c, fonts as f } from '../lib/theme';
import { SecurityUsage } from '../components/SecurityUsage';
import { useLocal } from '../lib/state';

export default function OwnerDashboard() {
 const {session}=useAuth(),{owner,loading:checking}=useOwner();
 const {externalMediaEnabled}=useLocal();
 const [tab,setTab]=useState('Tutor applications'),[status,setStatus]=useState('pending'),[page,setPage]=useState(0);
 const [applications,setApplications]=useState<TutorApplication[]>([]),[reports,setReports]=useState<ContentReport[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
 const imageGeneration=useRef(0);
 const [selected,setSelected]=useState<TutorApplication|null>(null),[note,setNote]=useState(''),[image,setImage]=useState(''),[viewed,setViewed]=useState(false),[confirmed,setConfirmed]=useState(false);
 const [reportDecision,setReportDecision]=useState<{report:ContentReport;decision:string}|null>(null);
 useFocusEffect(useCallback(()=>{setRevision(v=>v+1);},[]));
 useEffect(()=>{
  if(!owner)return;let active=true;
  void (tab==='Tutor applications'?ownerRequest<TutorApplication[]>('applications',{status,offset:page*100}).then(result=>{if(active)setApplications(result);}):ownerRequest<ContentReport[]>('reports',{status,offset:page*100}).then(result=>{if(active)setReports(result);}))
   .catch(problem=>{if(active)setError(problem.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[owner,tab,status,page,revision]);
 useEffect(()=>{if(!image)return;const timer=setTimeout(()=>{setImage('');setViewed(false);},60000);return()=>clearTimeout(timer);},[image]);
 useEffect(()=>()=>{imageGeneration.current++;},[]);
 function changeTab(value:string){setLoading(true);setTab(value);setStatus(value==='Tutor applications'?'pending':'open');setPage(0);setError('');setSuccess('');}
 async function open(application:TutorApplication){const generation=++imageGeneration.current;setSelected(application);setNote('');setImage('');setViewed(false);setConfirmed(false);setError('');
  try{const url=await transcriptUrl(application.transcript_path);if(generation===imageGeneration.current)setImage(url);}catch(problem){setError(problem instanceof Error?problem.message:'Transcript unavailable.');}}
 async function review(decision:'approved'|'rejected'){
  if(!selected||busy||decision==='approved'&&(!viewed||!confirmed))return;setBusy(true);setError('');
  try{await ownerRequest('review_application',{id:selected.id,decision,note,expected_status:selected.status});imageGeneration.current++;setSelected(null);setImage('');setSuccess(decision==='approved'?'Tutor approved. The course listing is now visible.':'Application rejected. It is not listed.');setRevision(v=>v+1);}
  catch(problem){setError(problem instanceof Error?problem.message:'Review failed.');}finally{setBusy(false);}
 }
 async function reviewReport(){if(!reportDecision||busy)return;setBusy(true);setError('');
  try{await ownerRequest('review_report',{id:reportDecision.report.id,decision:reportDecision.decision});setReportDecision(null);setSuccess('Report reviewed. The decision has been saved.');setRevision(v=>v+1);}
  catch(problem){setError(problem instanceof Error?problem.message:'Review failed.');}finally{setBusy(false);}
 }
 if(checking)return <ActivityIndicator color={c.purple}/>;
 if(!owner)return <Card><Empty icon="lock" title="Owner access only" description={session?'This account cannot access applications, transcripts, or the report queue.':'Sign in with the owner account to review applications and reports.'} action={<Button label={session?'Your account':'Sign in'} onPress={()=>router.push(session?'/profile':'/login')}/>}/></Card>;
 const count=tab==='Tutor applications'?applications.length:reports.length;
 return <>
  <PageHeading eyebrow="PRIVATE · OWNER ONLY" title="Review desk" subtitle="Tutor applications and content reports. Private records stay out of the public app." action={<Button secondary label="Refresh queue" icon="refresh-cw" loading={loading} onPress={()=>{setLoading(true);setError('');setRevision(v=>v+1);}}/>}/>
  <Chips items={['Tutor applications','Content reports']} value={tab} onChange={changeTab}/>
  <SecurityUsage />
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{(tab==='Tutor applications'?['pending','approved','rejected']:['open','resolved','dismissed']).map(item=><Pill key={item} label={item.charAt(0).toUpperCase()+item.slice(1)} active={status===item} onPress={()=>{setLoading(true);setStatus(item);setPage(0);}}/>)}</View>
  {!!error&&<T accessibilityRole="alert" style={{color:c.error,lineHeight:22}}>{error}</T>}{!!success&&<T accessibilityLiveRegion="polite" style={{color:c.green,lineHeight:22}}>{success}</T>}
  {loading?<ActivityIndicator color={c.purple}/>:!count?<Card><Empty icon="check-circle" title="This queue is clear" description="Items matching this status will appear here."/></Card>:tab==='Tutor applications'?applications.map(application=><Card key={application.id} style={{padding:22,gap:14}}><View style={{flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><Badge label={application.course_code}/><T muted style={{fontSize:12}}>{new Date(application.created_at).toLocaleDateString('en-CA')}</T></View><T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:21}}>{application.display_name}</T><T>{application.course_name}</T><T muted>{application.contact_email}</T><Button label={status==='approved'?'Review or remove listing':'Review application'} icon="file-text" onPress={()=>{void open(application);}}/></Card>):reports.map(report=><Card key={report.id} style={{padding:22,gap:14}}><Badge label={`${report.tutor_application_id?'Tutor listing':report.profile_id?'Student profile':'Venue post'} · ${report.reason}`}/><T style={{fontFamily:f.bold,fontSize:19}}>{report.display_name||report.source_username||'Reported content'}</T><T style={body}>{report.bio??report.caption??'The content is no longer available.'}</T><T muted style={{fontSize:12}}>Submitted {new Date(report.created_at).toLocaleString('en-CA')} · {report.profile_status||report.post_status}</T>{report.image_url&&externalMediaEnabled&&/^https:\/\/[^/?#:@]+\.(cdninstagram\.com|fbcdn\.net)\//.test(report.image_url)&&<Image source={{uri:report.image_url}} resizeMode="contain" accessibilityLabel="Reported venue post image" style={{height:240,width:'100%'}}/>}{report.image_url&&!externalMediaEnabled&&<Button secondary label="Manage external image choice" onPress={()=>router.push('/data-controls')}/>} {report.status==='open'&&<View style={{gap:10}}><Button label={report.tutor_application_id?'Remove tutor listing and resolve':report.profile_id?'Restrict profile and resolve':'Remove post and resolve'} icon="slash" onPress={()=>setReportDecision({report,decision:'remove'})}/><Button secondary label="Resolve · keep content" onPress={()=>setReportDecision({report,decision:'resolved'})}/><Button secondary label="Dismiss report" onPress={()=>setReportDecision({report,decision:'dismissed'})}/></View>}</Card>)}
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Button secondary label="Previous page" disabled={loading||page===0} onPress={()=>{setLoading(true);setPage(v=>v-1);}}/><T muted>Page {page+1}</T><Button secondary label="Next page" disabled={loading||count<100} onPress={()=>{setLoading(true);setPage(v=>v+1);}}/></View>
  <Modal visible={!!selected} transparent animationType="fade" onRequestClose={()=>{if(!busy){imageGeneration.current++;setSelected(null);setImage('');}}}><View style={{flex:1,backgroundColor:'#18131F99',padding:20,justifyContent:'center',alignItems:'center'}}><Card accessibilityViewIsModal style={{width:'100%',maxWidth:780,maxHeight:'94%'}}><ScrollView contentContainerStyle={{padding:22,gap:18}}>
   <T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:24}}>{selected?.display_name} · {selected?.course_code}</T><T>{selected?.course_name}</T><T style={body}>Completed: {selected?.term_completed}</T><T style={body}>Approach: {selected?.approach}</T><T style={body}>Experience: {selected?.experience||'Not supplied'}</T><T style={body}>Availability: {selected?.availability}</T><T style={body}>Rate: ${selected?.hourly_rate}/hour CAD</T>
   <T style={{fontFamily:f.bold}}>Private transcript</T><T muted style={{fontSize:12,lineHeight:20}}>Check the applicant name, exact course, term, and completion. Never share or download this image outside your review process. The image link expires after one minute.</T>
   {image?<Image source={{uri:image,headers:{'Cache-Control':'no-store'}}} resizeMode="contain" accessibilityLabel="Private course transcript for owner review" onLoad={()=>setViewed(true)} onError={()=>{setImage('');setViewed(false);}} style={{width:'100%',height:460,backgroundColor:c.background}}/>:<Button secondary label="Load transcript securely" onPress={()=>{if(selected)void open(selected);}}/>}
   <Pill label={confirmed?'Transcript and course checked':'I checked the transcript and course'} active={confirmed} onPress={()=>{if(viewed)setConfirmed(v=>!v);}}/>
   <FormField label="Review note for applicant (optional)" value={note} onChange={setNote} multiline maxLength={1000} disabled={busy}/>
   {!!error&&<T accessibilityRole="alert" style={{color:c.error}}>{error}</T>}
   {selected?.status==='pending'&&<Button label="Approve course listing" loading={busy} disabled={!confirmed||!viewed} onPress={()=>{void review('approved');}}/>}
   {selected?.status!=='rejected'&&<Button secondary label={selected?.status==='approved'?'Remove approved listing':'Reject application'} loading={busy} onPress={()=>{void review('rejected');}}/>}
   <Button secondary label="Close review" disabled={busy} onPress={()=>{imageGeneration.current++;setSelected(null);setImage('');}}/>
  </ScrollView></Card></View></Modal>
  <Modal visible={!!reportDecision} transparent animationType="fade" onRequestClose={()=>{if(!busy)setReportDecision(null);}}><View style={{flex:1,backgroundColor:'#18131F99',padding:24,justifyContent:'center',alignItems:'center'}}><Card accessibilityViewIsModal style={{width:'100%',maxWidth:520,padding:24,gap:18}}><T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:23}}>Confirm report review</T><T style={body}>{reportDecision?.decision==='remove'?'This removes the reported content from app visibility and resolves the report. Profile restrictions also prevent the owner publishing edits.':reportDecision?.decision==='dismissed'?'Dismiss this report without changing the content.':'Mark this report resolved and keep the content visible.'}</T>{!!error&&<T accessibilityRole="alert" style={{color:c.error}}>{error}</T>}<Button label="Confirm decision" loading={busy} onPress={()=>{void reviewReport();}}/><Button secondary label="Cancel" disabled={busy} onPress={()=>setReportDecision(null)}/></Card></View></Modal>
 </>;
}
