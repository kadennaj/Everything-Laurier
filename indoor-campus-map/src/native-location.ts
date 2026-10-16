import type { LocationEnvironment, OrientationReading } from './live-location';
declare global {
 interface Window { ReactNativeWebView?: { postMessage: (value: string) => void }; __EL_VIEW__?: string }
}
// Narrow bridge: no account tokens, storage access or arbitrary host commands.
export function nativeLocationEnvironment(): LocationEnvironment | null {
 if (!window.ReactNativeWebView) return null;
 let sequence = 0;
 const watches = new Map<number, (event: Event) => void>();
 const send = (type: string) => window.ReactNativeWebView!.postMessage(JSON.stringify({type}));
 return {
  now: Date.now, screenAngle: () => 0,
  geolocation: {
   watchPosition(success, error) {
    const id = ++sequence;
    const listener = (event: Event) => {
     const value = (event as CustomEvent).detail;
     if (value.type === 'position') success({coords:value.coords,timestamp:value.timestamp} as GeolocationPosition);
     if (value.type === 'error') error?.({code:value.code,message:'Location unavailable',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3});
    };
    watches.set(id,listener); window.addEventListener('el-location',listener); send('location-start'); return id;
   },
   clearWatch(id) { const listener=watches.get(id); if(listener) window.removeEventListener('el-location',listener); watches.delete(id); send('location-stop'); },
  },
  requestCompass: async () => 'granted',
  listen(callback) {
   const listener = (event: Event) => { const value=(event as CustomEvent).detail; if(value.type==='heading') callback({webkitCompassHeading:value.degrees,webkitCompassAccuracy:value.accuracy??45,alpha:null,beta:null,absolute:true} as OrientationReading); };
   window.addEventListener('el-location',listener); return () => window.removeEventListener('el-location',listener);
  },
 };
}
