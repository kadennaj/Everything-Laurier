import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { ownerRequest } from './tutoring';
export function useOwner() {
 const {session,ready}=useAuth();
 const [state,setState]=useState({owner:false,userId:''});
 useEffect(()=>{let active=true;
  if(session)void ownerRequest<boolean>('access').then(owner=>{if(active)setState({owner:owner===true,userId:session.user.id});}).catch(()=>{if(active)setState({owner:false,userId:session.user.id});});
  return()=>{active=false;};
 },[session]);
 return {owner:!!session && state.userId===session.user.id && state.owner,loading:!ready || !!session && state.userId!==session.user.id};
}
