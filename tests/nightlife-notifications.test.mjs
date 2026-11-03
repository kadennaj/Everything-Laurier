import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationSource, notificationTarget } from '../src/lib/notification-fields.ts';
import { dispatch } from '../supabase/functions/dispatch-nightlife-notifications/handler.ts';
const secret = 'a'.repeat(64);
const request = () => new Request('https://test.invalid', { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
const secretHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
const config = { secretHash, url: 'https://database.invalid', key: 'server-key' };
test('notification taps only open known venue feeds', () => {
 assert.equal(notificationSource('https://evil.invalid'), null);
 assert.equal(notificationTarget({ type: 'nightlife-post', source: 'rarenightclub', postId: '../owner' }), null);
 assert.equal(notificationTarget({ type: 'other', source: 'rarenightclub', postId: '123' }), null);
 assert.deepEqual(notificationTarget({ type: 'nightlife-post', source: 'rarenightclub', postId: '123_ABC' }), { pathname: '/nightlife', params: { source: 'rarenightclub' } });
});
test('unauthenticated dispatch cannot contact providers', async () => {
 const forbidden = () => { throw Error('Must not fetch'); };
 assert.equal((await dispatch(new Request('https://test.invalid', { method: 'POST' }), config, forbidden)).status, 401);
 assert.equal((await dispatch(new Request('https://test.invalid'), config, forbidden)).status, 405);
});
test('invalid scheduler credentials cannot reach Expo', async () => {
 let calls = 0;
 const response = await dispatch(request(), config, async url => { calls++; assert.match(url, /claim_nightlife_push$/); return new Response('{}', { status: 403 }); });
 assert.equal(response.status, 401); assert.equal(calls, 1);
});
test('paused delivery is a no-op', async () => {
 let calls = 0;
 const response = await dispatch(request(), config, async () => { calls++; return Response.json({ messages: [], receipts: [] }); });
 assert.equal(response.status, 200); assert.equal(calls, 1);
});
test('delivery sends generic content and records provider ticket', async () => {
 const calls = [];
 const ticket = '00000000-0000-4000-a000-000000000070';
 const response = await dispatch(request(), config, async (url, init) => {
  calls.push(url); const body = JSON.parse(init.body);
  if (url.endsWith('claim_nightlife_push')) return Response.json({ messages: [{ id: 'delivery', token: 'ExpoPushToken[synthetic]', post_id: 'post_1', source: 'rarenightclub' }], receipts: [] });
  if (url.endsWith('/send')) { assert.equal(body[0].title, 'Rare Nightclub'); assert.equal(body[0].sound, undefined); assert.equal(body[0].badge, undefined); assert.deepEqual(body[0].data, { type: 'nightlife-post', source: 'rarenightclub', postId: 'post_1' }); return Response.json({ data: [{ status: 'ok', id: ticket }] }); }
  assert.deepEqual(body.p_results, [{ id: 'delivery', ticket_id: ticket }]); return new Response(null, { status: 204 });
 });
 assert.equal(response.status, 200); assert.equal(calls.length, 3);
});
test('ambiguous provider failures are recorded without resending', async () => {
 let sends = 0;
 const response = await dispatch(request(), config, async (url, init) => {
  if (url.endsWith('claim_nightlife_push')) return Response.json({ messages: [{ id: 'delivery', token: 'synthetic', post_id: 'post_1', source: 'rarenightclub' }], receipts: [] });
  if (url.endsWith('/send')) { sends++; throw Error('Timeout'); }
  assert.deepEqual(JSON.parse(init.body).p_results, [{ id: 'delivery', error: 'SendNotConfirmed' }]); return new Response(null, { status: 204 });
 });
 assert.equal(response.status, 200); assert.equal(sends, 1);
});
test('receipts remove expired device tokens and retry missing receipts only', async () => {
 const response = await dispatch(request(), config, async (url, init) => {
  if (url.endsWith('claim_nightlife_push')) return Response.json({ messages: [], receipts: [{ id: 'gone', ticket_id: 'ticket' }, { id: 'missing', ticket_id: 'unknown' }] });
  if (url.endsWith('getReceipts')) return Response.json({ data: { ticket: { status: 'error', details: { error: 'DeviceNotRegistered' } } } });
  assert.deepEqual(JSON.parse(init.body).p_results, [{ id: 'gone', status: 'error', error: 'DeviceNotRegistered' }, { id: 'missing', status: 'missing' }]); return new Response(null, { status: 204 });
 });
 assert.equal(response.status, 200);
});

test('invalid 64-character scheduler secret is rejected before database work', async () => {
 const response = await dispatch(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: `Bearer ${'b'.repeat(64)}` } }), config, () => { throw Error('Must not fetch'); });
 assert.equal(response.status, 401);
});
