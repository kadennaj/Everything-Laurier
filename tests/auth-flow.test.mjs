import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { normalizeEmail, normalizeCode, requestEmailCode, verifyEmailCode, authErrorMessage, restorePendingEmailDraft } from '../src/lib/auth-flow.ts';

// Test-only transport: exercises the real Supabase client without sending email.
function fixture() {
  const requests = [];
  const stored = new Map();
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'student@example.com', aud: 'authenticated', role: 'authenticated', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() };
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.test-signature`;
  let failure;
  const options = {
    auth: { storageKey: 'auth-test', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storage: {
      getItem: name => stored.get(name) ?? null,
      setItem: (name, value) => stored.set(name, value),
      removeItem: name => stored.delete(name),
    } },
    global: { fetch: async (input, init = {}) => {
      const url = new URL(input);
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ path: url.pathname, body, method: init.method });
      if (failure) return Response.json(failure.body, { status: failure.status, headers: { 'x-supabase-api-version': '2024-01-01' } });
      if (url.pathname.endsWith('/otp')) return Response.json({});
      if (url.pathname.endsWith('/verify')) {
        if (body.token !== '123456') return Response.json({ code: 'otp_expired', msg: 'Token has expired or is invalid' }, { status: 403, headers: { 'x-supabase-api-version': '2024-01-01' } });
        return Response.json({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expires, user });
      }
      if (url.pathname.endsWith('/logout')) return new Response(null, { status: 204 });
      if (url.pathname.endsWith('/user')) return Response.json(user);
      throw new Error(`Unexpected test request: ${url.pathname}`);
    } },
  };
  const makeClient = () => createClient('https://auth-test.supabase.co', 'test-public-key', options);
  return { client: makeClient(), makeClient, requests, stored, fail: (status, body) => { failure = { status, body }; } };
}

test('email normalization accepts any domain and rejects malformed addresses before sending', async () => {
  const { client, requests } = fixture();
  assert.equal(normalizeEmail(' Student+club@Example.com '), 'student+club@example.com');
  for (const value of ['', 'student', 'person@', 'a@@b.com', 'student name@example.com']) {
    await assert.rejects(requestEmailCode(client.auth, value), /valid email/);
  }
  assert.equal(requests.length, 0);
});

test('requesting a code allows signup but does not authenticate; verification restores and logout removes session', async () => {
  const { client, makeClient, requests, stored } = fixture();
  assert.equal(await requestEmailCode(client.auth, ' Student@Example.com ', 'test-captcha-token'), 'student@example.com');
  assert.equal(requests[0].body.email, 'student@example.com');
  assert.equal(requests[0].body.create_user, true);
  assert.equal(requests[0].body.gotrue_meta_security.captcha_token, 'test-captcha-token');
  assert.equal((await client.auth.getSession()).data.session, null);
  await assert.rejects(verifyEmailCode(client.auth, 'student@example.com', '000000'), /invalid or has expired/);
  assert.equal((await client.auth.getSession()).data.session, null);
  const session = await verifyEmailCode(client.auth, 'student@example.com', '123 456');
  assert.equal(session.user.email, 'student@example.com');
  assert.equal(requests.at(-1).body.type, 'email');
  const restored = makeClient();
  assert.equal((await restored.auth.getSession()).data.session.user.id, session.user.id);
  const { error } = await restored.auth.signOut({ scope: 'local' });
  assert.equal(error, null);
  assert.equal((await restored.auth.getSession()).data.session, null);
  assert.equal(stored.has('auth-test'), false);
});

test('incomplete codes and malformed code characters never reach verification', async () => {
  const { client, requests } = fixture();
  for (const value of ['', '123', '123456789', 'abcdef', '123-456']) {
    await assert.rejects(verifyEmailCode(client.auth, 'student@example.com', value), /complete code/);
  }
  assert.equal(normalizeCode('12345678'), '12345678');
  assert.equal(requests.length, 0);
});

test('server rate limits are surfaced without exposing backend details', async () => {
  const { client, fail } = fixture();
  fail(429, { code: 'over_email_send_rate_limit', msg: 'Private backend details' });
  await assert.rejects(requestEmailCode(client.auth, 'student@example.com', 'test-captcha-token'), /Too many attempts/);
});

test('email and verification failures leave the user signed out', async () => {
  const { client, fail } = fixture();
  fail(400, { code: 'unexpected_failure', msg: 'Private backend details' });
  await assert.rejects(requestEmailCode(client.auth, 'student@example.com', 'test-captcha-token'), /couldn’t send/);
  await assert.rejects(verifyEmailCode(client.auth, 'student@example.com', '123456'), /couldn’t verify/);
  assert.equal((await client.auth.getSession()).data.session, null);
});

test('an empty verification response cannot become an authenticated session', async () => {
  const auth = { verifyOtp: async () => ({ data: { session: null }, error: null }) };
  await assert.rejects(verifyEmailCode(auth, 'student@example.com', '123456'), /couldn’t verify/);
});

test('connection and sign-out failures have actionable messages', () => {
  assert.match(authErrorMessage(new TypeError('fetch failed'), 'send'), /internet connection/);
  assert.match(authErrorMessage({}, 'signout'), /couldn’t sign you out/);
});

test('a code request survives reload only while its code is still valid', () => {
  const sentAt = 1_000_000;
  const draft = JSON.stringify({ email: ' Student@Example.com ', sentAt });
  assert.deepEqual(restorePendingEmailDraft(draft, sentAt + 60_000), { email: 'student@example.com', sentAt });
  assert.equal(restorePendingEmailDraft(draft, sentAt + 600_000), null);
  assert.equal(restorePendingEmailDraft(draft, sentAt - 1), null);
  assert.equal(restorePendingEmailDraft('{', sentAt), null);
  assert.equal(restorePendingEmailDraft(JSON.stringify({ email: 'invalid', sentAt }), sentAt), null);
});

 test('missing CAPTCHA tokens cannot send OTP requests and CAPTCHA failures are actionable', async () => {
 const { client, requests, fail } = fixture();
 await assert.rejects(requestEmailCode(client.auth, 'student@example.com', ''), /security check/);
 assert.equal(requests.length, 0);
 fail(400, {code:'captcha_failed', msg:'private provider error'});
 await assert.rejects(requestEmailCode(client.auth, 'student@example.com', 'rejected-token'), /new check/);
 assert.equal(requests.length, 1);
});
