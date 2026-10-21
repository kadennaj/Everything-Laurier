/** Bound bytes and read time before parsing any user-controlled JSON. */
export async function readDeletionBody(request: Request, maxBytes=1024, timeoutMs=5000): Promise<{value:unknown} | {status:400|408|413}> {
 const length=request.headers.get('content-length');
 if(length!==null && (!/^\d{1,9}$/.test(length)||Number(length)>maxBytes)) {void request.body?.cancel();return {status:413};}
 if(!request.body)return {status:400};
 const reader=request.body.getReader();let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),timeoutMs);});
 try {
  let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
  for(;;) {
   const {done,value}=await Promise.race([reader.read(),deadline]);
   if(done)break;
   bytes+=value.byteLength;if(bytes>maxBytes)return {status:413};
   text+=decoder.decode(value,{stream:true});
  }
  return {value:JSON.parse(text+decoder.decode()) as unknown};
 }catch(problem){return {status:problem instanceof Error&&problem.message==='timeout'?408:400};}
 finally {clearTimeout(timer);void reader.cancel().catch(()=>{});}
}
