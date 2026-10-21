import React, { useEffect, useRef } from 'react';
import { captchaUrl, readCaptchaMessage, type CaptchaProps } from '../lib/captcha';

export function AuthCaptcha({ requestId, onToken, onError }: CaptchaProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== 'https://everythinglaurier.ca' || event.source !== frame.current?.contentWindow) return;
      const result = readCaptchaMessage(event.data, requestId);
      if (result?.kind === 'token') onToken(result.token);
      else if (result?.kind === 'error') onError(result.error);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [requestId, onToken, onError]);
  return <iframe ref={frame} src={captchaUrl(requestId, window.location.origin)} title="Sign-in security check"
    referrerPolicy="no-referrer" style={{ width: '100%', height: 160, border: 0, display: 'block' }}
    onError={() => onError('The security check could not load. Please try again.')} />;
}
