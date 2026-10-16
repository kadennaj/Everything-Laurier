type Dependencies={url:string;serviceKey:string;tokenHash:string;fetch:typeof fetch};
export function tutorCleanupHandler(deps:Dependencies){return async(request:Request)=>{
 const reply=(status:number,body:object)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply(405,{error:'Method not allowed'});
 const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token||!/^[a-f0-9]{64}$/.test(deps.tokenHash))return reply(401,{error:'Unauthorized'});
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 const expected=Uint8Array.from(deps.tokenHash.match(/../g)!,b=>parseInt(b,16));let difference=0;
 for(let i=0;i<digest.length;i++)difference|=digest[i]^expected[i];
 if(difference)return reply(401,{error:'Unauthorized'});
 if(!deps.url.startsWith('https://')||!deps.serviceKey)return reply(503,{error:'Cleanup unavailable'});
 const headers={apikey:deps.serviceKey,Authorization:`Bearer ${deps.serviceKey}`,'Content-Type':'application/json'};
 try{
  let removed=0;
  for(let batch=0;batch<10;batch++){
   const response=await deps.fetch(`${deps.url}/rest/v1/rpc/tutor_storage_cleanup`,{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Candidate lookup failed');
   const paths=await response.json();
   if(!Array.isArray(paths)||paths.some(p=>typeof p!=='string'||!/^[-a-f0-9]{36}\/[-a-f0-9]{36}\/transcript\.jpg$/.test(p)))throw Error('Invalid candidates');
   if(!paths.length)return reply(200,{removed});
   const deletion=await deps.fetch(`${deps.url}/storage/v1/object/tutor-transcripts`,{method:'DELETE',headers,body:JSON.stringify({prefixes:paths}),signal:AbortSignal.timeout(20000)});
   if(!deletion.ok)throw Error('Storage cleanup failed');
   removed+=paths.length;
  }
  return reply(200,{removed,more:true});
 }catch{return reply(503,{error:'Cleanup incomplete; retry required'});}
};}
