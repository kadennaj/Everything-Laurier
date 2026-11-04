import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryHash, validatePassword, recoverReviewer, REVIEW_EMAIL } from '../release/review-account-reset/recovery.mjs';
const input={origin:'https://ekptnmermhvtrdqpjwwa.supabase.co',key:'sb_publishable_fixture',tokenHash:'a'.repeat(64),password:'unique-review-fixture-123',confirmation:'unique-review-fixture-123'};
test('recovery rejects malformed links and passwords before requests',async()=>{
 for(const fragment of ['','#access_token=abc','#token_hash=javascript:alert(1)'])assert.throws(()=>recoveryHash(fragment));
 assert.throws(()=>validatePassword('short','short'));assert.throws(()=>validatePassword(input.password,'different'));
 let calls=0;await assert.rejects(recoverReviewer({...input,tokenHash:'bad',fetcher:async()=>{calls++;}}));assert.equal(calls,0);
});
test('recovery cannot change a non-reviewer account',async()=>{
 const methods=[];await assert.rejects(recoverReviewer({...input,fetcher:async(url,options)=>{methods.push(options.method);return {ok:true,json:async()=>({access_token:'fixture',user:{id:'owner',email:'everythinglaurier@gmail.com'}})};}}));assert.deepEqual(methods,['POST']);
});
test('recovery verifies identity, updates only password and revokes recovery session',async()=>{
 const calls=[];const user={id:'reviewer',email:REVIEW_EMAIL};await recoverReviewer({...input,fetcher:async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>calls.length===1?{access_token:'fixture-token',user}:user};}});
 assert.equal(calls.length,4);assert.deepEqual(JSON.parse(calls[0].body),{token_hash:input.tokenHash,type:'recovery'});assert.equal(calls[1].method,'GET');assert.equal(calls[2].method,'PUT');assert.deepEqual(JSON.parse(calls[2].body),{password:input.password});assert.equal(calls[2].headers.Authorization,'Bearer fixture-token');assert.ok(calls[3].url.endsWith('/logout?scope=local'));for(const c of calls)assert.equal(c.credentials,'omit');
});
test('expired recovery cannot submit a password update',async()=>{let calls=0;await assert.rejects(recoverReviewer({...input,fetcher:async()=>{calls++;return {ok:false};}}));assert.equal(calls,1);});
