import { normalizeFeed, SOURCE_URL } from './normalize.ts';

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const syncTokenHash = Deno.env.get('FEED_SYNC_TOKEN_HASH') ?? '69bad17854952652aa91bd52191ab46dcb5dcfe1e40160d18c97694f039b42d0';

export async function handleSync(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const bearer = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!bearer || !/^[a-f0-9]{64}$/.test(syncTokenHash)) return json(401, { error: 'Unauthorized' });
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bearer)));
  const expected = Uint8Array.from(syncTokenHash.match(/../g)!, byte => parseInt(byte, 16));
  let difference = 0;
  for (let i = 0; i < digest.length; i++) difference |= digest[i] ^ expected[i];
  if (difference) return json(401, { error: 'Unauthorized' });
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json(503, { error: 'Calendar sync is not configured' });
  try { const target = new URL(url); if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) throw Error('Unsafe backend'); }
  catch { return json(503, { error: 'Calendar sync is not configured' }); }
  const observedAt = new Date().toISOString();
  let stage = 'fetch', upstreamStatus: number | null = null, databaseCode: string | null = null;
  try {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/json' } });
    upstreamStatus = response.status;
    if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw Error('Calendar unavailable');
    // Bound the decoded body while streaming, even if Content-Length is absent.
    const reader = response.body?.getReader();
    if (!reader) throw Error('Calendar response is empty');
    let size = 0, text = ''; const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000000) { await reader.cancel(); throw Error('Calendar response is too large'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    stage = 'normalize';
    const feed = normalizeFeed(JSON.parse(text));
    stage = 'cache';
    const write = await fetch(`${url}/rest/v1/rpc/replace_official_events`, {
      method: 'POST', signal: AbortSignal.timeout(20000), headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_events: feed.events, p_source_published: feed.published, p_observed_at: observedAt }),
    });
    if (!write.ok) { const failure = await write.json().catch(() => null); databaseCode = typeof failure?.code === 'string' ? failure.code : null; throw Error('Calendar cache update failed'); }
    const applied = await write.json();
    return json(200, { count: feed.events.length, applied, sourcePublished: feed.published, excludedInvalidDates: feed.excludedInvalidDates });
  } catch {
    // Never log credentials, publisher contact information, or overwrite a good snapshot on failure.
    return json(502, { error: 'Calendar update failed; previous events retained', stage, upstreamStatus, databaseCode });
  }
}
Deno.serve(handleSync);
