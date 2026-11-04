import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_REVIEW_EMAIL, isAppReviewEmail, signInReviewAccount } from '../src/lib/auth-flow.ts';
const password='synthetic-review-password-32-characters';
test('review password login requires the exact account, a password and CAPTCHA',async()=>{
 let calls=0;const auth={signInWithPassword:async()=>{calls++;throw Error('Must not call');}};
 for(const args of [['student@example.invalid',password,'captcha'],[APP_REVIEW_EMAIL,'short','captcha'],[APP_REVIEW_EMAIL,password,'']])await assert.rejects(signInReviewAccount(auth,...args));
 assert.equal(calls,0);assert.equal(isAppReviewEmail('  EVERYTHINGLAURIER+APPREVIEW@GMAIL.COM '),true);assert.equal(isAppReviewEmail('everythinglaurier@gmail.com'),false);
});
test('review login uses normal Supabase auth with CAPTCHA and validates the session',async()=>{
 const session={access_token:'test-token',user:{id:'test-user',email:APP_REVIEW_EMAIL}};
 const auth={signInWithPassword:async credentials=>{assert.deepEqual(credentials,{email:APP_REVIEW_EMAIL,password,options:{captchaToken:'captcha'}});return{data:{session},error:null};}};
 assert.equal(await signInReviewAccount(auth,APP_REVIEW_EMAIL,password,'captcha'),session);
 await assert.rejects(signInReviewAccount({signInWithPassword:async()=>({data:{session:null},error:null})},APP_REVIEW_EMAIL,password,'captcha'));
 await assert.rejects(signInReviewAccount({signInWithPassword:async()=>({data:{},error:{code:'invalid_credentials'}})},APP_REVIEW_EMAIL,password,'captcha'),/Check the review credentials/);
});
