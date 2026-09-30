import type { SupabaseClient } from '@supabase/supabase-js';

export const RESEND_DELAY_MS = 60_000;
export const CODE_LIFETIME_MS = 10 * 60_000;
export const AUTH_UNAVAILABLE = 'Email sign-in is unavailable right now. Please try again later.';

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  return email;
}

export function normalizeCode(value: string) {
  const code = value.replace(/\s/g, '');
  if (!/^\d{6,8}$/.test(code)) throw new Error('Enter the complete code from your email.');
  return code;
}

export function restorePendingEmailDraft(raw: string | null, now = Date.now()) {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as { email: string; sentAt: number };
    const email = normalizeEmail(draft.email);
    if (!Number.isFinite(draft.sentAt) || draft.sentAt > now || now >= draft.sentAt + CODE_LIFETIME_MS) return null;
    return { email, sentAt: draft.sentAt };
  } catch {
    return null;
  }
}

export function authErrorMessage(error: unknown, action: 'send' | 'verify' | 'signout') {
  const details = error as { code?: string; status?: number; name?: string } | null;
  if (details?.status === 429 || details?.code === 'over_email_send_rate_limit' || details?.code === 'over_request_rate_limit') {
    return 'Too many attempts. Please wait a minute before trying again.';
  }
  if (details?.code === 'otp_expired' || details?.code === 'otp_disabled' || details?.code === 'invalid_credentials') {
    return 'That code is invalid or has expired. Try the latest code, or request a new one.';
  }
  if (details?.name === 'AuthRetryableFetchError' || details?.name === 'TypeError') {
    return 'We couldn’t connect. Check your internet connection and try again.';
  }
  if (action === 'verify') return 'We couldn’t verify that code. Try again or request a new one.';
  if (action === 'signout') return 'We couldn’t sign you out. Please try again.';
  return 'We couldn’t send your code. Please try again shortly.';
}

type EmailAuth = Pick<SupabaseClient['auth'], 'signInWithOtp' | 'verifyOtp'>;

export async function requestEmailCode(auth: EmailAuth, value: string) {
  const email = normalizeEmail(value);
  try {
    const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
  } catch (error) {
    throw new Error(authErrorMessage(error, 'send'));
  }
  return email;
}

export async function verifyEmailCode(auth: EmailAuth, email: string, value: string) {
  const normalizedEmail = normalizeEmail(email);
  const token = normalizeCode(value);
  try {
    const { data, error } = await auth.verifyOtp({ email: normalizedEmail, token, type: 'email' });
    if (error) throw error;
    // Requesting an email alone never counts as a successful sign-in.
    if (!data.session?.user || !data.session.access_token) throw new Error('Missing session');
    return data.session;
  } catch (error) {
    throw new Error(authErrorMessage(error, 'verify'));
  }
}
