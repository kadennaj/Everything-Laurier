import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Barometer } from 'expo-sensors';

/** Opt-in, foreground-only sensor bridge. No readings are stored or uploaded. */
export function useMapElevation(send: (value: object) => void) {
 const generation = useRef(0);
 const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
 const sensor = useRef<{remove: () => void} | null>(null);
 const stop = useCallback(() => {generation.current++;sensor.current?.remove();sensor.current=null;if(watchdog.current)clearTimeout(watchdog.current);watchdog.current=null;},[]);
 const start = useCallback(async () => {
  stop(); const session = generation.current;
  try {
   if (!await Barometer.isAvailableAsync()) throw new Error('Unavailable');
   if (session !== generation.current) return;
   const permission = await Barometer.requestPermissionsAsync();
   if (session !== generation.current) return;
   if (!permission.granted || AppState.currentState !== 'active') throw new Error('Unavailable');
   Barometer.setUpdateInterval(1000);
   watchdog.current = setTimeout(() => {if(session === generation.current) {stop();send({type:'error',reason:'unavailable'});}},30000);
   sensor.current = Barometer.addListener(reading => {
    if (session !== generation.current) return;
    const relative = reading.relativeAltitude;
    const metres = typeof relative === 'number' && Number.isFinite(relative) ? relative : reading.pressure > 300 && reading.pressure < 1100 ? 44330 * (1-Math.pow(reading.pressure/1013.25,.1903)) : NaN;
    if (Number.isFinite(metres)) {if(watchdog.current)clearTimeout(watchdog.current);watchdog.current=null;send({type:'elevation',metres,timestamp:Date.now(),session});}
   });
  } catch {if (session === generation.current) {stop();send({type:'error',reason:'unavailable'});}}
 },[send,stop]);
 useEffect(() => {
  const subscription = AppState.addEventListener('change',value => {if (value !== 'active') {const active=!!sensor.current;stop();if(active)send({type:'error',reason:'paused'});}});
  return () => {stop();subscription.remove();};
 },[send,stop]);
 return {start,stop};
}
