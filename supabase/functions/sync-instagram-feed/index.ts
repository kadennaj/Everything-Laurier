import { INSTAGRAM_ACCOUNTS, normalizePost } from './normalize.ts';

const jsonHeaders = { 'Content-Type': 'application/json' };
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async request => {
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const syncSecret = Deno.env.get('FEED_SYNC_SECRET');
  const apifyToken = Deno.env.get('APIFY_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!syncSecret || !apifyToken || !supabaseUrl || !serviceKey) {
    return reply(503, { error: 'Feed sync is not configured' });
  }
  if (request.headers.get('Authorization') !== `Bearer ${syncSecret}`) {
    return reply(401, { error: 'Unauthorized' });
  }

  try {
    const scrape = await fetch(
      'https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?maxTotalChargeUsd=0.10',
      {
        method: 'POST',
        headers: { ...jsonHeaders, Authorization: `Bearer ${apifyToken}` },
        body: JSON.stringify({
          username: [...INSTAGRAM_ACCOUNTS],
          resultsLimit: 5,
          onlyPostsNewerThan: '7 days',
          skipPinnedPosts: true,
          dataDetailLevel: 'basicData',
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
