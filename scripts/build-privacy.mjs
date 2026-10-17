import {readFile,writeFile} from 'node:fs/promises';
const text=await readFile(new URL('../docs/privacy-policy.md',import.meta.url),'utf8');
const sections=[];
for(const block of text.trim().split(/\n\n+/)) {
 if(block.startsWith('# '))continue;
 if(block.startsWith('## ')){sections.push({title:block.slice(3),paragraphs:[]});continue;}
 if(!sections.length)sections.push({title:'About this policy',paragraphs:[]});
 sections.at(-1).paragraphs.push(block.replace(/\n/g,' '));
}
await writeFile(new URL('../src/data/privacy-policy.json',import.meta.url),JSON.stringify({version:'2026-10-17',sections},null,2)+'\n');
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const body=sections.map(s=>`<section><h2>${escape(s.title)}</h2>${s.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</section>`).join('\n');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Everything Laurier privacy policy for accounts, campus location, tutor applications, and private transcript review."><title>Privacy · Everything Laurier</title><link rel="icon" href="https://everythinglaurier.ca/assets/everything-laurier-logo.png"><style>body{margin:0;background:#faf9f6;color:#27252b;font:17px/1.75 system-ui,sans-serif}main{max-width:800px;margin:auto;padding:40px 24px 80px}h1{font-size:42px;line-height:1.2}h2{font-size:24px;line-height:1.4;margin-top:38px}a{color:#5e4279}p{overflow-wrap:anywhere}nav{display:flex;gap:20px;flex-wrap:wrap}a:focus-visible{outline:3px solid #5e4279;outline-offset:4px}</style></head><body data-policy-version="2026-10-17"><main><img src="https://everythinglaurier.ca/assets/everything-laurier-logo.png" alt="Everything Laurier" width="96" height="96"><nav><a href="/">Everything Laurier</a><a href="/support/">Support</a><a href="/community/">Community</a></nav><h1>Privacy policy</h1>${body}<p><a href="mailto:everythinglaurier@gmail.com">Contact the privacy operator</a></p></main></body></html>`;
await writeFile(new URL('../docs/privacy-policy.html',import.meta.url),html+'\n');
console.log('Privacy policy JSON and standalone HTML match the canonical Markdown.');
