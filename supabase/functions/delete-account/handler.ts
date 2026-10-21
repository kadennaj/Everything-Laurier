import { readDeletionBody } from './request-body.ts';
type Dependencies = { url: string; serviceKey: string; fetch: typeof fetch };

// Never accept a target user ID. Only the identity verified by Supabase Auth
// and its still-active database session can be deleted.
export function deletionHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    };
    const reply = (status: number, message: string) => Response.json({ error: message }, { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'Use POST to delete your account.');
    const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token || token.length>8192) return reply(401, 'Sign in before deleting your account.');
    if (!deps.url.startsWith('https://') || !deps.serviceKey) return reply(503, 'Account deletion is temporarily unavailable.');
    const parsed = await readDeletionBody(request);
    if ('status' in parsed) return reply(parsed.status,parsed.status===413?'Request too large.':parsed.status===408?'Request timed out. Try again.':'Confirm permanent account deletion.');
    try {
      const body = parsed.value as Record<string,unknown> | null;
      if (!body || body.confirm !== true || Object.keys(body).some(key => key !== 'confirm')) {
        return reply(400, 'Confirm permanent account deletion.');
      }
    } catch { return reply(400, 'Confirm permanent account deletion.'); }

    const call = (path: string, method: string, bearer: string, body?: object) => deps.fetch(`${deps.url}${path}`, {
      method,
      headers: { apikey: deps.serviceKey, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    try {
      const identity = await call('/auth/v1/user', 'GET', token);
      if (!identity.ok) return reply(401, 'Your session expired. Sign in again before deleting your account.');
      const user = await identity.json();
      if (typeof user.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.id)) {
        return reply(401, 'Unable to verify your account.');
      }
      const active = await call('/rest/v1/rpc/account_session_active', 'POST', token, {});
      if (!active.ok) return reply(503, 'Unable to verify your session. Please try again.');
      if (await active.json() !== true) return reply(401, 'Your session expired. Sign in again before deleting your account.');
      const quota = await call('/rest/v1/rpc/claim_account_deletion','POST',token,{});
      if (quota.status===429) return reply(429,'Too many deletion attempts. Wait before retrying.');
      if (!quota.ok) return reply(503,'Unable to reserve this request. Please try again.');
      if (await quota.json() !== true) return reply(429,'Too many deletion attempts. Wait before retrying.');
      // Revoke every refresh session before hard deletion. Sensitive database
      // operations also check auth.sessions, so old access JWTs cannot be reused.
      const revoked = await call('/auth/v1/logout?scope=global', 'POST', token);
      if (!revoked.ok) return reply(503, 'Could not secure your account for deletion. Please try again.');
      // Storage objects must be removed through the Storage API before deleting
      // their owner. Deleting database rows alone leaves private files behind.
      for (let batch=0;batch<10;batch++) {
        const candidates=await call('/rest/v1/rpc/tutor_storage_cleanup','POST',deps.serviceKey,{p_user_id:user.id});
        if(!candidates.ok)return reply(503,'Document cleanup did not finish. Sign in again and retry deletion.');
        const paths=await candidates.json();
        if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path.startsWith(`${user.id}/`)||!/^[-a-f0-9]{36}\/[-a-f0-9]{36}\/transcript\.jpg$/.test(path)))return reply(503,'Document cleanup could not be verified. Sign in again and retry.');
        if(!paths.length)break;
        const removal=await call('/storage/v1/object/tutor-transcripts','DELETE',deps.serviceKey,{prefixes:paths});
        if(!removal.ok||batch===9)return reply(503,'Document cleanup did not finish. Sign in again and retry deletion.');
      }
      const deleted = await call(`/auth/v1/admin/users/${user.id}`, 'DELETE', deps.serviceKey, { should_soft_delete: false });
      if (!deleted.ok) return reply(503, 'Deletion did not finish. Sign in again and retry.');
      // Foreign keys remove profiles and raw reports in the same transaction.
      // The report-delete trigger refreshes public anonymous queue aggregates.
      return Response.json({ deleted: true }, { status: 200, headers });
    } catch { return reply(503, 'Deletion could not be confirmed. Sign in again and retry.'); }
  };
}
