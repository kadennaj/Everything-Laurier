export function httpsPolicyUrl(value: string | undefined): string {
  try {
    const url = new URL(value?.trim() ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', 'example.com'].includes(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}

export const privacyPolicyUrl = httpsPolicyUrl(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://everythinglaurier.ca/privacy/');
