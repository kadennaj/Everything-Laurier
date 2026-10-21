import {readFile,readdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url), lock=JSON.parse(await readFile(new URL('package-lock.json',root),'utf8'));
const packages=[];const texts=new Map();let missing=0;
for(const [location,entry] of Object.entries(lock.packages)) {
 if(!location||entry.dev)continue;
 try {
  const dir=new URL(location+'/',root), pkg=JSON.parse(await readFile(new URL('package.json',dir),'utf8'));
  const files=(await readdir(dir)).filter(file=>/^(licen[cs]e|copying|notice|ofl)(\.|$)/i.test(file));
  const licenseTexts=[];for(const file of files){try{const value=await readFile(new URL(file,dir),'utf8');if(value.length<100000&&!value.includes('\u0000')){const id=String(texts.size);if(!texts.has(value))texts.set(value,id);licenseTexts.push(texts.get(value));}}catch{}}
  if(!licenseTexts.length)missing++;
  packages.push({name:pkg.name,version:pkg.version,license:typeof pkg.license==='string'?pkg.license:pkg.license?.type??'See package source',texts:licenseTexts});
 }catch{missing++;}
}
// Bundled font and map runtime notices are outside the parent lockfile.
for(const name of ['dm-sans','lora']){
 const dir=new URL('node_modules/@expo-google-fonts/'+name+'/',root);
 for(const file of (await readdir(dir)).filter(x=>/ofl|license/i.test(x)))try{const value=await readFile(new URL(file,dir),'utf8');if(!texts.has(value))texts.set(value,String(texts.size));}catch{}
}
for(const file of ['indoor-campus-map/node_modules/three/LICENSE','indoor-campus-map/node_modules/react/LICENSE','indoor-campus-map/node_modules/react-dom/LICENSE'])try{const value=await readFile(new URL(file,root),'utf8');if(!texts.has(value))texts.set(value,String(texts.size));}catch{}
packages.sort((a,b)=>a.name.localeCompare(b.name));
const result={generated:'2026-10-21',packages,texts:[...texts].map(([text,id])=>({id,text})),missing};
await writeFile(new URL('src/data/third-party-notices.json',root),JSON.stringify(result,null,2)+'\n');
const normalizeNotice=value=>value.split(/\r?\n/).map(line=>line.trimEnd()).join('\n').trimEnd()+'\n';
await writeFile(new URL('docs/THIRD-PARTY-NOTICES.txt',root),normalizeNotice(packages.map(p=>`${p.name} ${p.version} — ${p.license}`).join('\n')+'\n\n'+[...texts.keys()].join('\n\n----------------\n\n')));
console.log(`${packages.length} runtime packages, ${texts.size} distinct licence texts; ${missing} packages require source-notice review.`);
