type Config = { url?: string; key?: string; secretHash?: string };
type Message = { id: string; token: string; post_id: string; source: string };
type Receipt = { id: string; ticket_id: string };
const names: Record<string, string> = { rarenightclub: 'Rare Nightclub', prohibitionwarehouse: 'Prohibition Warehouse', thepubonking: 'The Pub on King', kentuckywaterloo: 'Kentucky Waterloo' };
const json = (status: number, value: object) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
export async function dispatch(request: Request, config: Config, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const secret = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!secret) return json(401, { error: 'Unauthorized' });
  if (!config.url || !config.key || !config.secretHash) return json(503, { error: 'Delivery unavailable' });
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)));
  const expected = config.secretHash.match(/../g)?.map(byte => Number.parseInt(byte, 16));
  if (!expected || expected.length !== 32 || digest.reduce((difference, byte, index) => difference | (byte ^ expected[index]), 0) !== 0) return json(401, { error: 'Unauthorized' });
  const rpc = async (name: string, values: object) => {
    const response = await fetcher(`${config.url}/rest/v1/rpc/${name}`, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { apikey: config.key!, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_secret: secret, ...values }) });
    return response;
  };
  const provider = async (path: string, body: object) => {
    const response = await fetcher(`https://exp.host/--/api/v2/push/${path}`, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw Error('Provider unavailable');
    const text = await response.text();
    if (text.length > 131072) throw Error('Invalid provider response');
    return JSON.parse(text);
  };
  try {
    const claim = await rpc('claim_nightlife_push', {});
    if (!claim.ok) return json(claim.status === 401 || claim.status === 403 ? 401 : 503, { error: 'Delivery unavailable' });
    const batch = await claim.json() as { messages: Message[]; receipts: Receipt[] };
    if (!Array.isArray(batch.messages) || !Array.isArray(batch.receipts) || batch.messages.length > 50 || batch.receipts.length > 50) return json(503, { error: 'Invalid batch' });
    const results: object[] = [];
    if (batch.messages.length) {
      try {
        const tickets = await provider('send', batch.messages.map(item => ({ to: item.token, title: names[item.source] ?? 'Venue post', body: 'A new post is available in Nightlife.', data: { type: 'nightlife-post', source: item.source, postId: item.post_id }, channelId: 'nightlife', ttl: 3600, interruptionLevel: 'passive' })));
        for (const [index, item] of batch.messages.entries()) {
          const ticket = Array.isArray(tickets.data) ? tickets.data[index] : null;
          results.push({ id: item.id, ...(ticket?.status === 'ok' && typeof ticket.id === 'string' && /^[a-f0-9-]{36}$/i.test(ticket.id) ? { ticket_id: ticket.id } : { error: ticket?.details?.error === 'DeviceNotRegistered' ? 'DeviceNotRegistered' : 'ProviderError' }) });
        }
      } catch { for (const item of batch.messages) results.push({ id: item.id, error: 'SendNotConfirmed' }); }
    }
    if (batch.receipts.length) {
      try {
        const receipts = await provider('getReceipts', { ids: batch.receipts.map(item => item.ticket_id) });
        for (const item of batch.receipts) {
          const receipt = receipts.data?.[item.ticket_id];
          results.push({ id: item.id, status: receipt?.status === 'ok' ? 'ok' : receipt ? 'error' : 'missing', error: receipt?.details?.error === 'DeviceNotRegistered' ? 'DeviceNotRegistered' : undefined });
        }
      } catch { for (const item of batch.receipts) results.push({ id: item.id, status: 'missing' }); }
    }
    if (results.length && !(await rpc('finish_nightlife_push', { p_results: results })).ok) return json(503, { error: 'Could not record results' });
    return json(200, { attempted: batch.messages.length, checked: batch.receipts.length });
  } catch { return json(503, { error: 'Delivery unavailable' }); }
}
