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
    const raw: unknown = await scrape.json();
    if (!Array.isArray(raw)) return reply(502, { error: 'Unexpected post provider response' });

    const syncedAt = new Date().toISOString();
    const posts = raw.map(post => normalizePost(post, syncedAt)).filter(post => post !== null);
    if (posts.length) {
      const save = await fetch(`${supabaseUrl}/rest/v1/instagram_feed_posts?on_conflict=id`, {
        method: 'POST',
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
