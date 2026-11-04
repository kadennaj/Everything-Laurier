import { recoveryHash, recoverReviewer } from './recovery.mjs';
import { origin, key } from './public-config.mjs';
const form=document.querySelector('#reset'), status=document.querySelector('#status');
let tokenHash, busy=false;
try { tokenHash=recoveryHash(location.hash); } catch(error) { status.textContent=error.message; form.hidden=true; }
history.replaceState(null,'',location.pathname);
window.addEventListener('pagehide',()=>{tokenHash=null;form.reset();});
form.addEventListener('submit', async event=>{
  event.preventDefault(); if(busy||!tokenHash)return;busy=true;const button=form.querySelector('button');button.disabled=true;status.textContent='Saving securely…';
  try { await recoverReviewer({origin,key,tokenHash,password:form.elements.namedItem('password').value,confirmation:form.elements.namedItem('confirmation').value});tokenHash=null;form.reset();form.hidden=true;status.textContent='Password saved. Enter this same password in Apple’s private App Review Information field and click Save. Do not send it in chat.'; }
  catch(error){status.textContent=error.message;} finally{busy=false;button.disabled=false;}
});
