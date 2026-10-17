import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Share, View } from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { mapAssets } from '../generated/campus-map-assets';
import * as Location from 'expo-location';
import html from '../generated/campus-map';
import { Button, T } from './ui';

export function IntegratedCampusMap() {
 const params=useLocalSearchParams();
 const [source]=useState(()=>{const p=new URLSearchParams();for(const key of ['building','floor','room','view','place'])if(typeof params[key]==='string')p.set(key,params[key]);return {html:html.replace('<script>','<script>window.__EL_VIEW__='+JSON.stringify(p.toString())+';')};});
 const web=useRef<WebView>(null), tracking=useRef(false), generation=useRef(0);
 const subscriptions=useRef<Location.LocationSubscription[]>([]);
 const [failed,setFailed]=useState(false), [attempt,setAttempt]=useState(0);
 const send=useCallback((value: object) => web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('el-location',{detail:${JSON.stringify(value)}}));true;`),[]);
 const stop=useCallback(() => { generation.current++; subscriptions.current.forEach(s=>s.remove()); subscriptions.current=[]; },[]);
 const start=useCallback(async () => {
  stop(); const version=generation.current;
  try {
   const permission=await Location.requestForegroundPermissionsAsync();
   if(version!==generation.current) return;
   if(!permission.granted) { tracking.current=false; send({type:'error',code:1}); return; }
   const gps=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:2,timeInterval:2000},fix=>send({type:'position',coords:fix.coords,timestamp:fix.timestamp}));
   if(version!==generation.current) { gps.remove(); return; } subscriptions.current.push(gps);
   try {
    const heading=await Location.watchHeadingAsync(value=>{const degrees=value.trueHeading>=0?value.trueHeading:value.magHeading;if(Number.isFinite(degrees)&&value.accuracy>0)send({type:'heading',degrees,accuracy:value.accuracy===3?10:value.accuracy===2?30:45});});
    if(version!==generation.current) heading.remove(); else subscriptions.current.push(heading);
   } catch { /* Compass is optional; foreground GPS still works. */ }
  } catch { if(version===generation.current) send({type:'error',code:2}); }
 },[send,stop]);
 useEffect(()=>{
  const state=AppState.addEventListener('change',value=>{if(value!=='active')stop();else if(tracking.current)void start();});
  return ()=>{tracking.current=false;stop();state.remove();};
 },[start,stop]);
 async function blueprint(path:string) {
  const module=mapAssets[path];if(!module)return;
  try {const asset=Asset.fromModule(module);await asset.downloadAsync();if(!asset.localUri)return;const data=await new File(asset.localUri).base64();
   web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('el-blueprint',{detail:${JSON.stringify({path,uri:'data:image/'+asset.type+';base64,'+data})}}));true;`);
  }catch { /* The source viewer retains a clear fallback label when unavailable. */ }
 }
 function external(value: string) {
  try { const url=new URL(value); if(url.protocol==='https:' && ['www.google.com','maps.apple.com','www.openstreetmap.org','www.wlu.ca','library.wlu.ca'].includes(url.hostname)) void Linking.openURL(value).catch(()=>{}); } catch { /* Reject arbitrary protocols. */ }
 }
 if(failed) return <View style={{padding:24,gap:16}}><T>The map could not load. Check your device’s WebGL support and try again.</T><Button label="Try map again" onPress={()=>{setFailed(false);setAttempt(v=>v+1);}} /></View>;
 return <WebView key={attempt} ref={web} source={source} style={{flex:1,backgroundColor:'#eef0eb'}} originWhitelist={['about:blank']} javaScriptEnabled domStorageEnabled={false} sharedCookiesEnabled={false} incognito
  onError={()=>{stop();setFailed(true);}} onContentProcessDidTerminate={()=>{stop();setFailed(true);}}
  onMessage={event=>{try{const message=JSON.parse(event.nativeEvent.data);if(message.type==='share'&&typeof message.params==='string'){const p=new URLSearchParams(message.params);const queryParams:Record<string,string>={};for(const key of ['building','floor','room','view','place'])if(p.get(key))queryParams[key]=p.get(key)!;void Share.share({message:ExpoLinking.createURL('/map',{queryParams})}).catch(()=>{});}else if(message.type==='blueprint'&&typeof message.path==='string'){void blueprint(message.path);}else if(message.type==='location-start'){tracking.current=true;void start();}else if(message.type==='location-stop'){tracking.current=false;stop();}}catch{/* Unknown bridge messages are ignored. */}}}
  onShouldStartLoadWithRequest={request=>{if(request.url==='about:blank')return true;external(request.url);return false;}}
  onOpenWindow={event=>external(event.nativeEvent.targetUrl)} />;
}
