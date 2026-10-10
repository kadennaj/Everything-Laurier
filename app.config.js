module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PROFILE === 'production' || process.env.APP_STORE_RELEASE === 'true') {
    const value = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
    let valid = false;
    try {
      const url = new URL(value);
      valid = url.protocol === 'https:' && !url.username && !url.password && !['localhost', '127.0.0.1', 'example.com'].includes(url.hostname);
    } catch { /* Missing or malformed URLs cannot pass the release gate. */ }
    if (!valid) throw new Error('Set EXPO_PUBLIC_PRIVACY_POLICY_URL to the published HTTPS privacy policy before building for the App Store.');
  }
  return config;
};
