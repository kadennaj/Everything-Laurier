import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { captchaUrl, readCaptchaMessage, type CaptchaProps } from '../lib/captcha';

export function AuthCaptcha({ requestId, onToken, onError }: CaptchaProps) {
  const finished = useRef(false);
  const reportError = useRef(onError);
  useEffect(() => { reportError.current = onError; }, [onError]);
  useEffect(() => {
    const timer = setTimeout(() => { if (!finished.current) reportError.current('The security check is taking too long. Check your internet connection, then restart it.'); }, 60_000);
    return () => clearTimeout(timer);
  }, []);
  return <View style={{ height: 160, width: '100%' }}>
    <WebView source={{ uri: captchaUrl(requestId) }} javaScriptEnabled domStorageEnabled
      style={{ flex: 1, backgroundColor: '#FFFFFF' }} originWhitelist={['https://everythinglaurier.ca', 'https://challenges.cloudflare.com', 'about:blank', 'about:srcdoc']}
      sharedCookiesEnabled thirdPartyCookiesEnabled
      setSupportMultipleWindows={false} allowsBackForwardNavigationGestures={false}
      onShouldStartLoadWithRequest={request => {
        // WKWebView can classify provider frames differently during redirects.
        // Allow the documented challenge origins for all frame classifications.
        if (request.url === 'about:blank' || request.url === 'about:srcdoc') return true;
        try { const url = new URL(request.url); return url.origin === 'https://challenges.cloudflare.com' || (url.origin === 'https://everythinglaurier.ca' && url.pathname === '/captcha/'); } catch { return false; }
      }}
      onMessage={event => {
        const result = readCaptchaMessage(event.nativeEvent.data, requestId);
        if (result?.kind === 'token') { finished.current = true; onToken(result.token); }
        else if (result?.kind === 'error') onError(result.error);
      }}
      onError={() => onError('The security check could not load. Check your connection and try again.')}
      onHttpError={() => onError('The security check is unavailable. Please try again.')}
    />
  </View>;
}
