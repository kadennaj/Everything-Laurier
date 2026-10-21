import assert from 'node:assert/strict';
import test from 'node:test';
import { captchaUrl, readCaptchaMessage } from '../src/lib/captcha.ts';
test('CAPTCHA bridge binds tokens to the current request and rejects malformed messages', () => {
  const message={type:'laurier-captcha',request:'current',event:'token',token:'fixture-token'};
  assert.equal(readCaptchaMessage(message,'other'),null);
  assert.equal(readCaptchaMessage('{','current'),null);
  assert.equal(readCaptchaMessage({...message,type:'other'},'current'),null);
  assert.equal(readCaptchaMessage({...message,token:'x'.repeat(4097)},'current'),null);
  assert.deepEqual(readCaptchaMessage(JSON.stringify(message),'current'),{kind:'token',token:'fixture-token'});
  assert.equal(readCaptchaMessage({...message,event:'expired'},'current').kind,'error');
  const url=new URL(captchaUrl('current','http://localhost:8081'));
  assert.equal(url.origin,'https://everythinglaurier.ca');
  assert.equal(url.search,'');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('parent'),'http://localhost:8081');
});
