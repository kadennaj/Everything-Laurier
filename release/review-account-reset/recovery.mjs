export const REVIEW_EMAIL = 'everythinglaurier+appreview@gmail.com';
export function recoveryHash(fragment) {
  const value = new URLSearchParams(fragment.replace(/^#/, '')).get('token_hash');
  if (!value || !/^[a-f0-9]{40,128}$/i.test(value)) throw Error('Open the newest password-reset email link.');
  return value;
}
export function validatePassword(password, confirmation) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 128) throw Error('Use a unique password with 16 to 128 characters.');
  if (password !== confirmation) throw Error('The passwords do not match.');
}
export async function recoverReviewer({ origin, key, tokenHash, password, confirmation, fetcher = fetch }) {
  validatePassword(password, confirmation);
  recoveryHash('#token_hash=' + tokenHash);
  if (origin !== 'https://ekptnmermhvtrdqpjwwa.supabase.co' || !key?.startsWith('sb_publishable_')) throw Error('Recovery is unavailable. Contact support.');
  const request = async (path, method, body, access) => {
    const response = await fetcher(origin + '/auth/v1/' + path, {method, headers: {apikey: key, 'Content-Type': 'application/json', ...(access ? {Authorization: 'Bearer ' + access} : {})}, ...(body ? {body: JSON.stringify(body)} : {}), credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw Error('The reset link expired or the request failed. Request a new reset email and try again.');
    return response.json();
  };
  const session = await request('verify', 'POST', {token_hash: tokenHash, type:'recovery'});
  if (!session.access_token || session.user?.email?.toLowerCase() !== REVIEW_EMAIL) throw Error('This page is only for Apple’s separate review account.');
  const user = await request('user', 'GET', null, session.access_token);
  if (user.email?.toLowerCase() !== REVIEW_EMAIL || user.id !== session.user.id) throw Error('The account could not be verified.');
  try {
    const updated = await request('user', 'PUT', {password}, session.access_token);
    if (updated.email?.toLowerCase() !== REVIEW_EMAIL || updated.id !== user.id) throw Error('The password update could not be confirmed.');
  } finally {
    try { await request('logout?scope=local', 'POST', {}, session.access_token); } catch { /* Recovery credentials are never persisted. */ }
  }
}
