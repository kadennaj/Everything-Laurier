import { AccountConsent } from './AccountConsent';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { useAuth } from '../lib/auth';
import { colors as c, fonts as f } from '../lib/theme';
import { emptyTutorAnswers, TutorAnswers, validateTranscript, validateTutorAnswers } from '../lib/tutor-fields';
import { createTutorDraft, submitTutorDraft, TutorApplication, TutorListing, tutorRequest, withdrawApplication } from '../lib/tutoring';
import { Badge, Button, Card, Chips, Empty, ExternalButton, Icon, Search, T, body } from './ui';
import { ReportContent } from './ReportContent';
import { FormField } from './FormField';

export function Tutoring() {
 const {session,ready}=useAuth();
 const [tab,setTab]=useState('Find a tutor'),[query,setQuery]=useState(''),[page,setPage]=useState(0),[tutors,setTutors]=useState<TutorListing[]>([]),[applications,setApplications]=useState<TutorApplication[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[withdrawing,setWithdrawing]=useState<string|null>(null),[confirm,setConfirm]=useState<string|null>(null);
 const refresh=()=>setRevision(v=>v+1);
 useFocusEffect(useCallback(()=>{refresh();},[]));
 useEffect(()=>{
  if(!session)return;
  let active=true;
  const timer=setTimeout(()=>{setLoading(true);setError('');void Promise.all([tutorRequest<TutorListing[]>('directory',{query,offset:page*100}),tutorRequest<TutorApplication[]>('mine')]).then(([list,mine])=>{if(active){setTutors(list);setApplications(mine);}}).catch(problem=>{if(active)setError(problem.message);}).finally(()=>{if(active)setLoading(false);});},250);
  return()=>{active=false;clearTimeout(timer);};
 },[session,query,page,revision]);
 async function withdraw(application:TutorApplication){setWithdrawing(application.id);setError('');try{await withdrawApplication(application);setConfirm(null);refresh();}catch(problem){setError(problem instanceof Error?problem.message:'Please try again.');refresh();}finally{setWithdrawing(null);}}
 return <View style={{gap:20}}>
  <View style={{gap:9}}><T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:24}}>Course help, from someone who’s taken it.</T><T style={body}>Find a peer tutor approved for a specific course, or apply to help other students. Independent peer tutoring; not a Laurier service.</T></View>
  <Chips items={['Find a tutor','Become a tutor','My applications']} value={tab} onChange={setTab} />
  {!ready?<ActivityIndicator color={c.purple}/>:!session?<Card><Empty icon="book-open" title="Connect with a course tutor" description="Sign in to browse approved tutors, apply, or manage your applications." action={<Button label="Sign in" onPress={()=>router.push('/login')}/>}/></Card>:<>
   {error&&<Card style={{padding:20,gap:12}}><T accessibilityRole="alert" style={{color:c.error}}>{error}</T><Button secondary label="Try again" onPress={refresh}/></Card>}
   {tab==='Find a tutor'&&<><Search value={query} onChange={value=>{setLoading(true);setQuery(value);setPage(0);}} placeholder="Search a course, like CP104…"/>{loading?<ActivityIndicator color={c.purple}/>:!tutors.length&&!error?<Card><Empty title="No approved tutors for this course yet" description="Try another course, check back soon, or apply to become the first tutor." action={<Button label="Become a tutor" onPress={()=>setTab('Become a tutor')}/>}/></Card>:tutors.map(tutor=><Card key={tutor.id} style={{padding:22,gap:14}}><View style={{flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><Badge label={`${tutor.course_code} · Manually approved`}/><T style={{fontFamily:f.bold}}>{Number(tutor.hourly_rate)===0?'Free':`$${Number(tutor.hourly_rate).toFixed(2)}/hour CAD`}</T></View><T accessibilityRole="header" style={{fontSize:22,fontFamily:f.bold}}>{tutor.display_name}</T><T style={{fontFamily:f.medium}}>{tutor.course_name}</T><T style={body}>{tutor.approach}</T><T muted style={{fontSize:13,lineHeight:21}}>{tutor.availability}</T><Button label="Email tutor" icon="mail" onPress={()=>{void Linking.openURL(`mailto:${encodeURIComponent(tutor.contact_email)}?subject=${encodeURIComponent(`Tutoring for ${tutor.course_code}`)}`).catch(()=>setError('Your email app could not open. Please try again.'));}}/><ReportContent kind="tutor" target={tutor.id}/><T muted style={{fontSize:11,lineHeight:18}}>Course evidence has been reviewed. This is not a guarantee of teaching quality or results. Arrange scheduling and payment directly; the app takes no payment.</T></Card>)}{!loading&&!error&&<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12}}><Button secondary label="Previous tutors" disabled={page===0} onPress={()=>{setLoading(true);setPage(v=>v-1);}}/><T muted>Page {page+1}</T><Button secondary label="More tutors" disabled={tutors.length<100} onPress={()=>{setLoading(true);setPage(v=>v+1);}}/></View>}</>}
   {tab==='Become a tutor'&&<AccountConsent><TutorForm onSubmitted={()=>{refresh();setTab('My applications');}}/></AccountConsent>}
   {tab==='My applications'&&(loading?<ActivityIndicator color={c.purple}/>:!applications.length?<Card><Empty title="Your applications will appear here" description="Apply for one course at a time with evidence that you completed it." action={<Button label="Apply to tutor" onPress={()=>setTab('Become a tutor')}/>}/></Card>:applications.map(application=><Card key={application.id} style={{padding:22,gap:14}}><Badge label={application.status==='draft'?'Draft · not submitted':application.status==='pending'?'Awaiting manual review':application.status.charAt(0).toUpperCase()+application.status.slice(1)}/><T style={{fontFamily:f.bold,fontSize:20}}>{application.course_code} · {application.course_name}</T><T style={body}>{application.status==='approved'?'Your listing is visible to signed-in students.':application.status==='pending'?'Your transcript and answers are private while the owner reviews them.':application.status==='draft'?'This draft has not been sent for review. Discard it to start again.':'This application is not listed.'}</T>{!!application.review_note&&<T style={body}>Review note: {application.review_note}</T>}{application.status!=='withdrawn'&&(confirm===application.id?<View style={{gap:10}}><T>Withdraw this application and remove its listing and transcript?</T><Button label="Confirm withdrawal" loading={withdrawing===application.id} onPress={()=>{void withdraw(application);}}/><Button secondary label="Keep application" disabled={!!withdrawing} onPress={()=>setConfirm(null)}/></View>:<Button secondary label={application.status==='draft'?'Discard draft':'Withdraw application'} disabled={!!withdrawing} onPress={()=>setConfirm(application.id)}/>)}</Card>))}
  </>}
  <ExternalButton label="Laurier academic support" url="https://students.wlu.ca/academics/support-and-advising/student-success/index.html"/>
 </View>;
}

function TutorForm({onSubmitted}:{onSubmitted:()=>void}) {
 const {session}=useAuth();
 const [answers,setAnswers]=useState<TutorAnswers>(emptyTutorAnswers),[image,setImage]=useState<{uri:string;bytes:Uint8Array}|null>(null),[draft,setDraft]=useState<TutorApplication|null>(null);
 const [busy,setBusy]=useState(false),[picking,setPicking]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>{if(image&&Platform.OS!=='web'){try{new File(image.uri).delete();}catch{/* The OS can reclaim temporary cache files. */}}},[image]);
 const inFlight=useRef(false);
 const update=(key:keyof TutorAnswers,value:string|boolean)=>setAnswers(previous=>({...previous,[key]:value}));
 async function choose(){
  if(picking||busy||draft)return;setPicking(true);setError('');
  try {
   const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1,exif:false,base64:false});
   if(selected.canceled)return;
   const asset=selected.assets[0];
   if(asset.width*asset.height>50000000)throw Error('Choose an image below 50 megapixels.');
   const context=ImageManipulator.manipulate(asset.uri);
   if(Math.max(asset.width,asset.height)>2400)context.resize(asset.width>=asset.height?{width:2400}:{height:2400});
   const rendered=await context.renderAsync();
   const normalized=await rendered.saveAsync({format:SaveFormat.JPEG,compress:.9});
   const buffer=Platform.OS==='web'?await (await fetch(normalized.uri)).arrayBuffer():await new File(normalized.uri).arrayBuffer();
   const bytes=new Uint8Array(buffer);validateTranscript(bytes);setImage({uri:normalized.uri,bytes});
  }catch(problem){setError(problem instanceof Error?problem.message:'The image could not be prepared. Choose another image.');}finally{setPicking(false);}
 }
 async function submit(){
  if(inFlight.current)return;setError('');
  try{validateTutorAnswers(answers);if(!image)throw Error('Choose a transcript image first.');inFlight.current=true;setBusy(true);
   const current=draft??await createTutorDraft(answers);setDraft(current);
   try{await submitTutorDraft(current,image.bytes);}catch(problem){
    // A timed-out response may have committed. Read the server before offering a retry.
    const mine=await tutorRequest<TutorApplication[]>('mine');if(!mine.some(item=>item.id===current.id&&['pending','approved','rejected'].includes(item.status)))throw problem;
   }
   setImage(null);onSubmitted();
  }catch(problem){setError(problem instanceof Error?problem.message:'Submission failed. Please try again.');}finally{inFlight.current=false;setBusy(false);}
 }
 const field=(key:keyof TutorAnswers,label:string,helper?:string,multiline=false,maxLength=120,numeric=false)=><FormField label={label} value={String(answers[key])} onChange={value=>update(key,value)} helper={helper} multiline={multiline} maxLength={maxLength} numeric={numeric} disabled={busy||!!draft}/>;
 return <Card style={{padding:22,gap:22}}>
  <View style={{gap:9}}><T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:22}}>Apply for one course</T><T style={body}>Every application is manually reviewed. Nothing is listed until approved. Your contact email will be {session?.user.email}.</T></View>
  <T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:18}}>You and your course</T>
  {field('display_name','Your name',undefined,false,80)}
  {field('course_code','Course code','For example CP104 or BU111. Apply separately for each course.',false,12)}
  {field('course_name','Course title')}
  {field('term_completed','When did you complete this course?','For example Fall 2025.',false,80)}
  <T accessibilityRole="header" style={{fontFamily:f.bold,fontSize:18}}>Your tutoring offer</T>
  {field('approach','How would you help a student understand this course?','30–1,200 characters. Explain your approach without offering to do graded work.',true,1200)}
  {field('experience','Relevant experience (optional)','Teaching, mentoring, or other experience.',true,1200)}
  {field('availability','Availability and meeting format','Share general times and online/on-campus preference. Do not include your home address.',true,400)}
  {field('hourly_rate','Hourly rate in CAD','Enter 0 to offer free tutoring. Maximum $200/hour.',false,6,true)}
  <View style={{gap:12,padding:16,backgroundColor:c.background,borderRadius:12}}><View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Icon name="lock" color={c.purple}/><T style={{fontFamily:f.bold}}>Private course evidence</T></View><T style={{fontSize:15,lineHeight:24,color:c.muted}}>Upload a clear image showing your name, this course, term, and completion/grade. Redact your student number, address, unrelated courses and grades first. A cropped screenshot is enough. Do not upload another person’s transcript. The image is kept privately for owner review and is never in your tutor listing.</T><Button secondary label={image?'Replace transcript image':'Choose transcript image'} icon="upload" loading={picking} disabled={busy||!!draft} onPress={()=>{void choose();}}/>{image&&<><Image source={{uri:image.uri}} accessibilityLabel="Your selected transcript preview" resizeMode="contain" style={{width:'100%',height:220,backgroundColor:c.surface}}/><T muted style={{fontSize:12}}>Prepared image · {(image.bytes.byteLength/1024/1024).toFixed(1)} MB</T></>}</View>
  <Pressable accessibilityRole="checkbox" accessibilityLabel="Consent to private review and publication after approval" accessibilityState={{checked:answers.consent,disabled:busy||!!draft}} disabled={busy||!!draft} onPress={()=>update('consent',!answers.consent)} style={({pressed})=>({flexDirection:'row',gap:12,minHeight:48,padding:14,borderRadius:12,borderWidth:1,borderColor:answers.consent?c.purple:c.border,backgroundColor:answers.consent?c.lavender:c.surface,opacity:pressed?.75:1})}><Icon name={answers.consent?'check-square':'square'} color={c.purple}/><T style={{flex:1,fontSize:15,lineHeight:24}}>I consent to private review of my answers and transcript. If approved, share my name, verified email, course, tutoring approach, availability, and rate with signed-in students. I confirm I completed this course and will follow academic integrity rules. I can withdraw my listing and transcript.</T></Pressable>
  <T muted style={{fontSize:12,lineHeight:20}}>Reviewed transcript images are removed after 30 days; pending images after 90 days. An approved listing can remain after its image is removed. See Privacy policy for details.</T>
  <Button secondary label="Read privacy policy" onPress={()=>router.push('/privacy')}/>
  {!!draft&&<T style={body}>A draft is saved. Retry this upload, or discard the draft from My applications to change your answers.</T>}
  {!!error&&<T accessibilityRole="alert" style={{color:c.error,lineHeight:22}}>{error}</T>}
  {(!image || !answers.consent) && <T muted accessibilityLiveRegion="polite" style={{fontSize:14,lineHeight:22}}>{!image ? 'Add your course evidence image to continue.' : 'Confirm the review and publication consent above to continue.'}</T>}
  <Button label={busy?'Uploading and submitting…':draft?'Retry submission':'Submit application for review'} loading={busy} disabled={picking||!answers.consent||!image} onPress={()=>{void submit();}}/>
 </Card>;
}
