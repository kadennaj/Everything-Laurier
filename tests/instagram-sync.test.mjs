import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

const testSyncToken = 'a'.repeat(64);
const values = new Map([
  ['FEED_SYNC_TOKEN_HASH', createHash('sha256').update(testSyncToken).digest('hex')],
  ['APIFY API', 'test-apify-token'],
  ['SUPABASE_URL', 'https://example.supabase.co'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'test-server-key'],
]);
let handler;
globalThis.Deno = {
  env: { get: name => values.get(name) },
  serve: callback => { handler = callback; },
};
await import('../supabase/functions/sync-instagram-feed/index.ts');

const request = secret => new Request('https://example.supabase.co/functions/v1/sync-instagram-feed', {
  method: 'POST', headers: { Authorization: `Bearer ${secret}` },
});

test('the sync endpoint refuses calls without its server-only secret', async () => {
  const response = await handler(request('wrong-secret'));
  assert.equal(response.status, 401);
});

test('a successful run fetches four accounts and saves only valid posts', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return Response.json([
      { ownerUsername: 'thepubonking', url: 'https://www.instagram.com/reel/CODE1/', caption: 'Tonight', timestamp: '2026-09-30T10:00:00Z' },
      { ownerUsername: 'unrelated', url: 'https://www.instagram.com/p/CODE2/', caption: 'Other', timestamp: '2026-09-30T10:00:00Z' },
    ]);
    return new Response(null, { status: 204 });
  };
  try {
    const response = await handler(request(testSyncToken));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).saved, 1);
    assert.match(calls[0].url, /apify~instagram-scraper\/run-sync-get-dataset-items/);
    assert.match(calls[0].url, /maxTotalChargeUsd=0\.05/);
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-apify-token');
    assert.deepEqual(JSON.parse(calls[0].options.body).directUrls,
      ['rarenightclub', 'prohibitionwarehouse', 'thepubonking', 'kentuckywaterloo']
        .map(username => `https://www.instagram.com/${username}/`));
    assert.equal(JSON.parse(calls[0].options.body).resultsType, 'posts');
    assert.equal(JSON.parse(calls[0].options.body).resultsLimit, 4);
    assert.equal(calls[1].options.headers.Authorization, 'Bearer test-server-key');
    assert.deepEqual(JSON.parse(calls[1].options.body).map(post => post.id), ['CODE1']);
  } finally { globalThis.fetch = originalFetch; }
});
