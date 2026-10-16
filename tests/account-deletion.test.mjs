import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deletionHandler } from '../supabase/functions/delete-account/handler.ts';
import { httpsPolicyUrl } from '../src/lib/privacy.ts';

const userId = '00000000-0000-4000-8000-000000000001';
function fixture(failurePath, failureStatus = 500, active = true) {
  const requests = [];
  const handler = deletionHandler({ url: 'https://test.supabase.co', serviceKey: 'server-secret', fetch: async (url, options) => {
    requests.push({ url, ...options });
    if (url.includes(failurePath ?? 'NEVER')) return Response.json({ message: 'internal details' }, { status: failureStatus });
    if (url.endsWith('/user')) return Response.json({ id: userId });
    if (url.endsWith('/account_session_active')) return Response.json(active);
    if (url.includes('tutor_storage_cleanup')) return Response.json([]);
    if (url.includes('/logout')) return new Response(null, { status: 204 });
    return Response.json({ id: userId });
  } });
  const send = (body = { confirm: true }, authorization = 'Bearer user-token', method = 'POST') => handler(new Request('https://test.supabase.co/functions/v1/delete-account', {
    method, headers: { authorization, 'content-type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }));
  return { requests, send };
}

test('deletion requires POST, authentication and explicit confirmation; rejects target IDs', async () => {
  const { requests, send } = fixture();
  assert.equal((await send({}, '', 'GET')).status, 405);
  assert.equal((await send({ confirm: true }, '')).status, 401);
  assert.equal((await send({ confirm: false })).status, 400);
  assert.equal((await send({ confirm: true, user_id: 'another-person' })).status, 400);
  assert.equal(requests.length, 0);
});

test('invalid or revoked sessions cannot reach session revocation or deletion', async () => {
  const invalid = fixture('/user', 401);
  assert.equal((await invalid.send()).status, 401);
  assert.equal(invalid.requests.length, 1);
  const revoked = fixture(undefined, 500, false);
  assert.equal((await revoked.send()).status, 401);
  assert.equal(revoked.requests.length, 2);
});

test('verified owner is globally signed out before hard deletion; no secret returned', async () => {
  const { requests, send } = fixture();
  const response = await send();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true });
  assert.equal(requests.length, 5);
  assert.match(requests[2].url, /logout\?scope=global$/);
  assert.equal(requests[2].headers.Authorization, 'Bearer user-token');
  assert.equal(requests[4].url, `https://test.supabase.co/auth/v1/admin/users/${userId}`);
  assert.equal(requests[4].method, 'DELETE');
  assert.equal(requests[4].headers.Authorization, 'Bearer server-secret');
  assert.deepEqual(JSON.parse(requests[4].body), { should_soft_delete: false });
});

test('failed verification/revocation/deletion never reports success or leaks server errors', async () => {
  for (const [path, calls] of [['account_session_active', 2], ['logout', 3], ['tutor_storage_cleanup', 4], ['admin/users', 5]]) {
    const { requests, send } = fixture(path);
    const response = await send();
    assert.equal(response.status, 503);
    assert.equal(requests.length, calls);
    assert.doesNotMatch(await response.text(), /internal details|server-secret/);
  }
});

test('unencrypted backend configuration cannot send account tokens', async () => {
  const handler = deletionHandler({ url: 'http://test.supabase.co', serviceKey: 'secret', fetch: () => { throw new Error('Must not run'); } });
  assert.equal((await handler(new Request('https://test/delete', { method: 'POST', headers: { authorization: 'Bearer token' }, body: '{"confirm":true}' }))).status, 503);
});

test('privacy policy URL rejects insecure, placeholder and credential-bearing links', () => {
  for (const value of [undefined, '', 'http://site.ca/privacy', 'https://example.com/privacy', 'https://user:secret@site.ca/privacy', 'https://localhost/privacy']) assert.equal(httpsPolicyUrl(value), '');
  assert.equal(httpsPolicyUrl(' https://site.ca/privacy '), 'https://site.ca/privacy');
});
