// Fail production builds before an archive is generated with missing privacy/backend configuration.
if (process.env.EAS_BUILD_PROFILE === 'production' || process.env.APP_STORE_RELEASE === 'true') {
  const backend = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!backend?.startsWith('https://') || !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_EMAIL_LOGIN_ENABLED !== 'true') {
    throw new Error('Configure the HTTPS backend, publishable key and email sign-in in the EAS production environment before building. Never use a secret/service-role key.');
  }
  if (!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key for the app.');
  await import('./check-release-privacy.mjs');
  if (process.exitCode) throw new Error('Privacy-policy check failed.');
  for (const path of ['support', 'community']) {
    const response = await fetch(`https://everythinglaurier.ca/${path}/`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok || !new URL(response.url).href.startsWith('https://') || !response.headers.get('content-type')?.includes('text/html')) throw new Error(`The public ${path} page must be accessible before release.`);
    const page = await response.text();
    if (!page.includes('everythinglaurier@gmail.com')) throw new Error(`The ${path} page must include the authorized contact.`);
  }
  console.log('Public policy, support and community pages verified. Complete native/store checks before submission.');
}
