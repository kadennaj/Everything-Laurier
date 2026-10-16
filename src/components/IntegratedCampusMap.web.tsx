import React, {useEffect,useRef,useState} from 'react';
import {router} from 'expo-router';
export function IntegratedCampusMap() {
 const frame=useRef<HTMLIFrameElement>(null);
 const [source]=useState(()=>'/campus-map/index.html'+(typeof window==='undefined'?'':'#'+window.location.search.slice(1)));
 useEffect(()=>{const listener=(event:MessageEvent)=>{
  if(event.source!==frame.current?.contentWindow||event.origin!==window.location.origin||event.data?.type!=='map-view'||typeof event.data.params!=='string')return;
  const p=new URLSearchParams(event.data.params);const params:Record<string,string|undefined>={};
  for(const key of ['building','floor','room','view'])params[key]=p.get(key)||undefined;
  router.setParams(params);
 };window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[]);
 return <iframe ref={frame} title="Interactive campus and indoor map" src={source} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="geolocation; accelerometer; gyroscope; magnetometer" referrerPolicy="no-referrer" style={{width:'100%',height:'100%',border:0,display:'block',background:'#eef0eb'}} />;
}
