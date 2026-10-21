import { useEffect, useRef, useState } from 'react';
import { FloorEstimator } from './floor-estimate';
import type { ElevationReading, FloorEstimate } from './floor-estimate';
export function useFloorEstimate() {
 const estimator = useRef<FloorEstimator | null>(null);
 const lastReading = useRef(0);
 const [estimate, setEstimate] = useState<FloorEstimate | null>(null);
 const [message, setMessage] = useState('');
 function stop() {
  estimator.current = null; setEstimate(null);
  window.ReactNativeWebView?.postMessage(JSON.stringify({type:'elevation-stop'}));
 }
 function start(floor: number, levels: number[], height: number) {
  stop(); setMessage('');
  if (!window.ReactNativeWebView) {setMessage('Floor estimation needs the phone app. Choose your floor here.'); return;}
  estimator.current = new FloorEstimator(floor, levels, height); lastReading.current = 0;
  setEstimate({floor:null,delta:null,status:'calibrating'});
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'elevation-start'}));
 }
 useEffect(() => {
  const listener = (event: Event) => {
   if (!estimator.current) return;
   const value = (event as CustomEvent).detail;
   if (value.type === 'error') {
    estimator.current = null; setEstimate(null); setMessage(value.reason === 'paused' ? 'Floor estimate paused. Confirm your floor to restart.' : 'Height sensor unavailable. Choose your floor.'); return;
   }
   if (value.type !== 'elevation') return;
   lastReading.current = Date.now();
   const next = estimator.current.update(value as ElevationReading); setEstimate(next);
   if (next.status === 'expired') {
    estimator.current = null; window.ReactNativeWebView?.postMessage(JSON.stringify({type:'elevation-stop'}));
    setMessage('Confirm your floor to recalibrate.');
   }
  };
  const pause = () => { if (document.hidden && estimator.current) {stop();setMessage('Confirm your floor to restart the estimate.');} };
  const timer = window.setInterval(() => { if (estimator.current && lastReading.current > 0 && Date.now() - lastReading.current > 6000) {stop();setMessage('Height signal lost. Confirm your floor to restart.');} },1000);
  window.addEventListener('el-elevation',listener); document.addEventListener('visibilitychange',pause);
  return () => {window.clearInterval(timer);window.removeEventListener('el-elevation',listener);document.removeEventListener('visibilitychange',pause);window.ReactNativeWebView?.postMessage(JSON.stringify({type:'elevation-stop'}));};
 },[]);
 return {estimate,message,start,stop};
}
