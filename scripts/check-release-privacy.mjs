// Run with the same public environment as the production app build.
const value = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
try {
  if (!value) throw new Error('Publish the privacy policy and set EXPO_PUBLIC_PRIVACY_POLICY_URL before release.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', 'example.com'].includes(url.hostname)) throw new Error('Use a real public HTTPS privacy-policy URL.');
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok || new URL(response.url).protocol !== 'https:' || !response.headers.get('content-type')?.includes('text/html')) throw new Error('The policy must open as an accessible HTTPS webpage.');
  const text = await response.text();
  if (!/Everything Laurier/i.test(text) || !/privacy/i.test(text) || /Owner must confirm|draft for owner review/i.test(text)) throw new Error('Publish the reviewed Everything Laurier policy, not a draft or placeholder.');
  if (!text.includes('2026-10-16') || !/transcript/i.test(text) || !/foreground/i.test(text)) throw new Error('Publish the updated location and tutor-transcript privacy policy before release.');
  console.log('Public privacy-policy page is accessible. Complete the release checklist before submission.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Privacy-policy validation failed.');
  process.exitCode = 1;
}
