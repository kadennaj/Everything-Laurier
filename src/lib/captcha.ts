// Public widget key only. The private verification key belongs in Supabase Auth.
export const CAPTCHA_SITE_KEY = '0x4AAAAAAFfbMlS4qXHS0g9Y';
export const CAPTCHA_PAGE = 'https://everythinglaurier.ca/captcha/';
export const CAPTCHA_MAX_AGE_MS = 120_000;
export type CaptchaProps = { requestId: string; onToken: (token: string) => void; onError: (message: string) => void };

export function captchaUrl(requestId: string, parentOrigin?: string) {
  const params = new URLSearchParams({ request: requestId });
  if (parentOrigin) params.set('parent', parentOrigin);
  return `${CAPTCHA_PAGE}#${params}`;
}

export function readCaptchaMessage(raw: unknown, requestId: string) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object') return null;
    const message = value as Record<string, unknown>;
    if (message.type !== 'laurier-captcha' || message.request !== requestId) return null;
    if (message.event === 'token' && typeof message.token === 'string' && message.token.length > 0 && message.token.length <= 4096) return { kind: 'token' as const, token: message.token };
    if (message.event === 'expired' || message.event === 'error') return { kind: 'error' as const, error: 'The security check expired or could not finish. Please try again.' };
  } catch { /* Ignore malformed or unrelated bridge messages. */ }
  return null;
}
