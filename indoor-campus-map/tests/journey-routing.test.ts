import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeJourney} from '../src/journey-routing.ts';
import type {IndoorBuilding} from '../src/types.ts';
const read=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const campus=read('../src/data/campus.json'), network=read('../src/data/campus-indoor-links.json');
const buildings:IndoorBuilding[]=[...read('../src/data/indoors.json'),...read('../src/data/new-indoors.json')];
const links=read('../src/data/indoor-connections.json');
const library=buildings.find(b=>b.id==='LIB')!;
const room=library.floors.find(f=>f.level===3)!.rooms.find(r=>r.kind==='study' && r.routeable!==false)!;
test('a confirmed upstairs room connects through mapped floor changes to a campus destination',()=>{
 const route=routeJourney(campus,network,buildings,links,room.id,'BA',null);
 assert.ok(route); assert.equal(route.nodes[0].floor,3);assert.equal(route.nodes[0].buildingId,'LIB');
 assert.ok(route.edges.some(e=>e.kind==='stairs'||e.kind==='elevator'));
 assert.ok(route.edges.some(e=>e.kind==='transfer'));
 assert.equal(route.hasUnmeasuredAccess,true);
 assert.equal(route.edges.length,route.nodes.length-1);
 for(let i=0;i<route.edges.length;i++){
  const a=route.nodes[i],b=route.nodes[i+1];
  if(!!a.buildingId!==!!b.buildingId)assert.equal(route.edges[i].kind,'transfer');
 }
});
test('campus to room and cross-campus room routes preserve both indoor coordinate frames',()=>{
 const target=buildings.find(b=>b.id==='LH')!.floors[1].rooms.find(r=>r.kind==='classroom'&&r.routeable!==false)!;
 const incoming=routeJourney(campus,network,buildings,links,'BA',room.id,null,true);
 assert.ok(incoming);assert.equal(incoming.nodes.at(-1)!.buildingId,'LIB');assert.ok(!incoming.edges.some(e=>e.kind==='stairs'));
 const between=routeJourney(campus,network,buildings,links,room.id,target.id,null);
 assert.ok(between);assert.equal(between.nodes.at(-1)!.buildingId,'LH');assert.equal(between.edges.filter(e=>e.kind==='transfer').length,2);
});
test('same-building room route stays entirely indoors; missing endpoints have no fallback invention',()=>{
 const entrance=library.floors.flatMap(f=>f.rooms).find(r=>r.kind==='entrance'&&r.routeable!==false)!;
 const inside=routeJourney(campus,network,buildings,links,entrance.id,room.id,null);
 assert.ok(inside);assert.ok(!inside.edges.some(e=>e.kind==='transfer'));
 assert.equal(routeJourney(campus,network,buildings,links,'not-a-room',room.id,null),null);
});
