import assert from 'node:assert/strict';
import test from 'node:test';

const token = 'a'.repeat(64);
const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))).toString('hex');
globalThis.Deno = { env: { get: name => ({ FEED_SYNC_TOKEN_HASH: hash, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-server-key' })[name] }, serve() {} };
const { handleSync } = await import('../supabase/functions/sync-official-events/index.ts');
const request = () => new Request('https://test.example/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
test('only authenticated POST requests can fetch or modify the calendar', async () => {
  const original = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; throw Error('unexpected'); };
  try {
    assert.equal((await handleSync(new Request('https://test.example'))).status, 405);
    assert.equal((await handleSync(new Request('https://test.example', { method: 'POST' }))).status, 401);
    assert.equal((await handleSync(new Request('https://test.example', { method: 'POST', headers: { Authorization: `Bearer ${'b'.repeat(64)}` } }))).status, 401);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
test('bad upstream responses leave the previous database snapshot untouched', async () => {
  const original = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url) => { if(String(url).endsWith('/claim_sync_budget'))return Response.json(true); calls.push(url); return Response.json({ events: [], cmsEventCount: '2', lastPublished: 'today' }); };
  try { assert.equal((await handleSync(request())).status, 502); assert.equal(calls.length, 1); }
  finally { globalThis.fetch = original; }
});
test('a complete valid empty feed atomically clears removed listings via the private RPC', async () => {
  const original = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => { if(String(url).endsWith('/claim_sync_budget'))return Response.json(true); calls.push({ url, options }); return calls.length === 1 ? Response.json({ events: [], cmsEventCount: '0', lastPublished: 'today' }) : Response.json(true); };
  try {
    assert.equal((await handleSync(request())).status, 200); assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://events.wlu.ca/_data/current-live.json');
    assert.ok(!calls[0].options.headers.Authorization);
    assert.equal(calls[1].url, 'https://test.supabase.co/rest/v1/rpc/replace_official_events');
    assert.deepEqual(JSON.parse(calls[1].options.body).p_events, []);
  } finally { globalThis.fetch = original; }
});

 test('calendar budget denial never calls the upstream feed',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async(url)=>{calls++;assert.match(String(url),/claim_sync_budget$/);return Response.json(false);};
 try{assert.equal((await handleSync(request())).status,429);assert.equal(calls,1);}finally{globalThis.fetch=original;}
 });
