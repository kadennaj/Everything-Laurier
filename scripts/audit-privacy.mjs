import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const extensions=new Set(['.ts','.tsx','.js','.mjs','.sql','.py','.html','.css']);
const skipped=new Set(['node_modules','dist','.git','.expo','.temp','generated']);
const rows=[];const findings=[];
async function scan(directory){
 for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
  if(skipped.has(entry.name)||entry.isSymbolicLink())continue;
  const file=path.join(directory,entry.name);
  if(entry.isDirectory()){await scan(file);continue;}
  if(!extensions.has(path.extname(file)))continue;
  const content=await readFile(path.join(root,file),'utf8'),lines=content.split('\n');
  const client=file.startsWith('src/')||file.startsWith('indoor-campus-map/src/');
  for(let index=0;index<lines.length;index++){
   const line=lines[index];
   if(client&&(/sb_secret_[A-Za-z0-9_-]{12,}/.test(line)||/process\.env\.[A-Z_]*(SERVICE_ROLE|SECRET_KEY)/.test(line)))findings.push(`${file}:${index+1}: private client credential`);
   if(client&&/getPublicUrl/.test(line)&&/transcript/i.test(line))findings.push(`${file}:${index+1}: public transcript URL`);
  }
  rows.push({file,lines:lines.length,sha256:createHash('sha256').update(content).digest('hex')});
 }
}
for(const directory of ['src','scripts','supabase','tests','indoor-campus-map/src','indoor-campus-map/scripts','indoor-campus-map/tests','vendor'])await scan(directory);
const config=JSON.parse(await readFile(path.join(root,'app.json'),'utf8'));
const location=config.expo.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-location')?.[1];
if(!location||location.isIosBackgroundLocationEnabled||location.isAndroidBackgroundLocationEnabled)findings.push('Foreground-only location config missing');
const picker=config.expo.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-image-picker')?.[1];
if(picker?.cameraPermission!==false||picker?.microphonePermission!==false)findings.push('Unexpected camera/microphone permission');
const map=await readFile(path.join(root,'src/generated/campus-map.ts'),'utf8');
if(/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(map))findings.push('Map loads an external font service');
const policy=JSON.parse(await readFile(path.join(root,'src/data/privacy-policy.json'),'utf8'));
if(policy.version!=='2026-10-21')findings.push('Privacy policy version is stale');
await writeFile(path.join(root,'docs/privacy-review-inventory.csv'),'file,lines,sha256\n'+rows.sort((a,b)=>a.file.localeCompare(b.file)).map(r=>`${r.file},${r.lines},${r.sha256}`).join('\n')+'\n');
if(findings.length){console.error(findings.join('\n'));process.exitCode=1;}
else console.log(`Privacy scan passed: ${rows.length} first-party code files / ${rows.reduce((sum,r)=>sum+r.lines,0)} lines. Hashed inventory saved; manual data-flow review is documented separately.`);
