// Low-volume negative probes. No signed-in user, private record, or valid OTP.
import assert from 'node:assert/strict';
const base=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!base?.startsWith('https://')||!key)throw Error('Load the public app environment first.');
const results=[];
async function probe(label,path,method,body,statuses){
 const r=await fetch(base+path,{method,headers:{apikey:key,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
 const data=await r.json();assert.ok(statuses.includes(r.status),`${label}: unexpected HTTP ${r.status}`);
 results.push({label,status:r.status,code:data.code??data.error_code??null});return data;
}
await probe('Public calendar still readable','/rest/v1/rpc/official_event_feed','POST',{},[200]);
await probe('Guest cannot write a profile','/rest/v1/student_profiles','POST',{},[401,403]);
await probe('Guest cannot write venue posts','/rest/v1/instagram_feed_posts','POST',{},[401,403]);
await probe('Guest cannot call owner tools','/rest/v1/rpc/owner_portal','POST',{p_action:'access'},[401,403]);
await probe('Guest cannot reserve account deletion','/rest/v1/rpc/claim_account_deletion','POST',{},[401,403]);
await probe('Account deletion rejects missing login','/functions/v1/delete-account','POST',{confirm:true},[401]);
const captcha=await probe('Sign-in rejects missing CAPTCHA','/auth/v1/otp','POST',{email:'security-audit@example.invalid',create_user:false},[400,422,429]);
assert.ok(captcha.code==='captcha_failed'||captcha.error_code==='captcha_failed'||results.at(-1).status===429,'CAPTCHA must be verified server-side');
console.log(JSON.stringify(results,null,2));
