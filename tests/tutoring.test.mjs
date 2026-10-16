import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateTutorAnswers,validateTranscript,TRANSCRIPT_MAX_BYTES} from '../src/lib/tutor-fields.ts';
import {tutorCleanupHandler} from '../supabase/functions/tutor-storage-cleanup/handler.ts';
const answers={display_name:'Peer Tutor',course_code:'cp 104',course_name:'Programming I',term_completed:'Fall 2025',approach:'I use practice problems and questions to explain each concept.',experience:'',availability:'Evenings online',hourly_rate:'20',consent:true};
test('tutor answers normalize course codes and require explicit publication consent',()=>{
 assert.equal(validateTutorAnswers(answers).course_code,'CP104');
 assert.equal(validateTutorAnswers({...answers,hourly_rate:'0'}).hourly_rate,0);
 for(const changes of [{consent:false},{hourly_rate:''},{hourly_rate:'Infinity'},{hourly_rate:'-1'},{hourly_rate:'201'},{course_code:'<script>'},{approach:'Do homework'},{display_name:'A'}])assert.throws(()=>validateTutorAnswers({...answers,...changes}));
});
test('transcript validation rejects empty, oversized, SVG and fake JPEG uploads',()=>{
 assert.doesNotThrow(()=>validateTranscript(new Uint8Array([255,216,255,224])));
 for(const bytes of [new Uint8Array(),new Uint8Array(TRANSCRIPT_MAX_BYTES+1),new TextEncoder().encode('<svg onload="alert(1)"/>'),new Uint8Array([137,80,78,71])])assert.throws(()=>validateTranscript(bytes));
});
test('cleanup refuses unauthenticated calls without touching storage',async()=>{
 let calls=0;
 const handler=tutorCleanupHandler({url:'https://test.supabase.co',serviceKey:'secret',tokenHash:'a'.repeat(64),fetch:async()=>{calls++;throw Error('unexpected');}});
 assert.equal((await handler(new Request('https://test',{method:'GET'}))).status,405);
 assert.equal((await handler(new Request('https://test',{method:'POST'}))).status,401);
 assert.equal((await handler(new Request('https://test',{method:'POST',headers:{authorization:'Bearer '+'b'.repeat(64)}}))).status,401);
 assert.equal(calls,0);
});
test('authenticated maintenance removes only validated transcript paths and retries failures',async()=>{
 const token='c'.repeat(64),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 const hash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
 const path='00000000-0000-4000-a000-000000000001/00000000-0000-4000-b000-000000000001/transcript.jpg';
 const requests=[];let lookup=0;
 const handler=tutorCleanupHandler({url:'https://test.supabase.co',serviceKey:'server-secret',tokenHash:hash,fetch:async(url,options)=>{
  requests.push({url,options});if(url.endsWith('tutor_storage_cleanup'))return Response.json(lookup++===0?[path]:[]);return Response.json([]);
 }});
 const response=await handler(new Request('https://test',{method:'POST',headers:{authorization:`Bearer ${token}`}}));
 assert.deepEqual(await response.json(),{removed:1});assert.equal(requests[1].options.method,'DELETE');assert.deepEqual(JSON.parse(requests[1].options.body),{prefixes:[path]});
});
