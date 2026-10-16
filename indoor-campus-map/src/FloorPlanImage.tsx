import {useEffect,useState} from 'react';
import './native-location';
export function FloorPlanImage({path,description}:{path:string;description:string}) {
 const [image,setImage]=useState('');
 useEffect(()=>{
  if(!window.ReactNativeWebView)return;
  const listener=(event:Event)=>{const value=(event as CustomEvent).detail;if(value.path===path&&typeof value.uri==='string'&&value.uri.startsWith('data:image/'))setImage(value.uri);};
  window.addEventListener('el-blueprint',listener);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'blueprint',path}));
  return()=>window.removeEventListener('el-blueprint',listener);
 },[path]);
 return <img className="blueprint-image" src={window.ReactNativeWebView?(image||'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='):'/campus-map'+path} alt={description}/>;
}
