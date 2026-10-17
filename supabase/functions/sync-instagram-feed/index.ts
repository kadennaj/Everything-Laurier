import { INSTAGRAM_ACCOUNTS, normalizePost } from './normalize.ts';

const jsonHeaders = { 'Content-Type': 'application/json' };
// SHA-256 of the 32-byte random sync token stored only in Supabase Vault.
const syncTokenHash = Deno.env.get('FEED_SYNC_TOKEN_HASH') ??
  '69bad17854952652aa91bd52191ab46dcb5dcfe1e40160d18c97694f039b42d0';
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async request => {
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const bearer = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!bearer) return reply(401, { error: 'Unauthorized' });
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bearer)));
  const expected = Uint8Array.from(syncTokenHash.match(/../g)!, byte => Number.parseInt(byte, 16));
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= digest[index] ^ expected[index];
  if (difference !== 0) return reply(401, { error: 'Unauthorized' });

  const apifyToken = Deno.env.get('APIFY_TOKEN') ?? Deno.env.get('APIFY API');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apifyToken || !supabaseUrl || !serviceKey) {
    return reply(503, { error: 'Feed sync is not configured' });
  }

  try {
    const budget = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_sync_budget`, {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_job: 'instagram' }),
    });
    if (!budget.ok) return reply(503, { error: 'Could not reserve sync budget' });
    if (await budget.json() !== true) return reply(429, { error: 'Sync frequency or daily budget reached' });
    const scrape = await fetch(
      'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?maxTotalChargeUsd=0.05',
      {
        method: 'POST',
        headers: { ...jsonHeaders, Authorization: `Bearer ${apifyToken}` },
        body: JSON.stringify({
          resultsType: 'posts',
          directUrls: INSTAGRAM_ACCOUNTS.map(username => `https://www.instagram.com/${username}/`),
          resultsLimit: 4,
          onlyPostsNewerThan: '7 days',
          addParentData: false,
        }),
        signal: AbortSignal.timeout(100_000),
      },
    );
    if (!scrape.ok) {
      console.error('Apify feed sync failed with status', scrape.status);
      return reply(502, { error: 'Post provider unavailable' });
    }
    const reader = scrape.body?.getReader();
    if (!reader) return reply(502, { error: 'Empty provider response' });
    let size = 0, text = ''; const decoder = new TextDecoder();
    for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 2000000) { await reader.cancel(); return reply(502, { error: 'Provider response too large' }); }
      text += decoder.decode(value, {stream:true}); }
    text += decoder.decode();
    const raw: unknown = JSON.parse(text);
    if (!Array.isArray(raw)) return reply(502, { error: 'Unexpected post provider response' });

    const syncedAt = new Date().toISOString();
    const posts = raw.slice(0,16).map(post => normalizePost(post, syncedAt)).filter(post => post !== null);
    if (posts.length) {
      const save = await fetch(`${supabaseUrl}/rest/v1/instagram_feed_posts?on_conflict=id`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          ...jsonHeaders,
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(posts),
      });
      if (!save.ok) {
        console.error('Venue post save failed with status', save.status);
        return reply(502, { error: 'Could not save posts' });
      }
    }
    return reply(200, { received: raw.length, saved: posts.length, syncedAt });
  } catch (error) {
    console.error('Venue post sync failed', error instanceof Error ? error.name : 'unknown');
    return reply(502, { error: 'Feed sync failed' });
  }
});
