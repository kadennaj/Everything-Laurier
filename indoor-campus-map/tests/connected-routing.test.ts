import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildConnectedIndoorGraph, buildIndoorGraph, projectToSegment, routeConnectedIndoors, shortestRoute } from "../src/routing.ts";
import type { IndoorBuilding, IndoorConnection, Point } from "../src/types.ts";
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const buildings: IndoorBuilding[] = read("../src/data/new-indoors.json");
const connections: IndoorConnection[] = read("../src/data/indoor-connections.json");
const originals: IndoorBuilding[] = read("../src/data/indoors.json");
function inside(p: Point, polygon: Point[]) {
  if (polygon.some((a,i) => projectToSegment(p,a,polygon[(i+1)%polygon.length]).distance < .01)) return false;
  let hit = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a[1]>p[1]) !== (b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
}
test("New photos supply 14 floors, retain all 22 sources, and do not replace the original floors", () => {
  assert.deepEqual(buildings.map(b=>[b.id,b.floors.length]),[["ARTS",3],["P",3],["SC",3],["DAWB",5]]);
  assert.equal([...originals,...buildings].flatMap(b=>b.floors).length,28);
  const sources = new Set(buildings.flatMap(b=>b.floors.flatMap(f=>f.sourcePhotos ?? [])));
  assert.equal(sources.size,22);
  for (const source of sources) assert.ok(readFileSync(new URL(`../public${source}`,import.meta.url)).length>1000);
  for (const b of buildings) for (const f of b.floors) assert.ok(readFileSync(new URL(`../public${f.blueprint}`,import.meta.url)).length>1000);
  const ids=[...originals,...buildings].flatMap(b=>b.floors.flatMap(f=>f.rooms.map(r=>r.id)));
  assert.equal(new Set(ids).size,ids.length);
});
for (const building of buildings) {
  test(`${building.name}: public destinations are connected, reference rooms are excluded`, () => {
    const graph=buildIndoorGraph(building);
    const entrance=building.floors.flatMap(f=>f.rooms).find(r=>r.kind==="entrance" && r.routeable!==false)!;
    for (const f of building.floors) for (const room of f.rooms) {
      if (room.routeable===false) { assert.equal(graph.nodes.has(`room:${room.id}`),false); continue; }
      assert.ok(shortestRoute(graph,`room:${entrance.id}`,`room:${room.id}`),room.id);
      assert.ok(room.polygon.some((a,i)=>projectToSegment(room.door,a,room.polygon[(i+1)%room.polygon.length]).distance<.01),`${room.id} door detached`);
    }
    const first=building.floors[0].rooms.filter(r=>r.kind==="elevator");
    for (const f of building.floors.slice(1)) for (const lift of f.rooms.filter(r=>r.kind==="elevator")) {
      assert.deepEqual(lift.door,first.find(r=>r.connector===lift.connector)!.door,`${lift.id} shaft registration`);
    }
  });
  test(`${building.name}: walking edges stay out of other enclosed rooms and courtyard voids`, () => {
    const graph=buildIndoorGraph(building);
    for (const edge of graph.edges.filter(e=>e.kind==="walk")) {
      const a=graph.nodes.get(edge.from)!,b=graph.nodes.get(edge.to)!;
      const floor=building.floors.find(f=>f.level===a.floor)!;
      for (let n=1;n<40;n++) {
        const p: Point=[a.point[0]+(b.point[0]-a.point[0])*n/40,a.point[1]+(b.point[1]-a.point[1])*n/40];
        for (const room of floor.rooms) {
          if (room.open || a.id===`room:${room.id}` || b.id===`room:${room.id}`) continue;
          assert.equal(inside(p,room.polygon),false,`${edge.from} → ${edge.to} crosses ${room.id}`);
        }
        for (const hole of floor.holes ?? []) assert.equal(inside(p,hole),false,`${edge.from} crosses courtyard`);
      }
    }
  });
}
test("Arts and Peters–Schlegel have source-supported links; Science joins Bricker separately", () => {
  const graph=buildConnectedIndoorGraph([...buildings,...originals],connections);
  assert.equal(graph.edges.filter(e=>e.kind==="connection").length,5);
  const expected=[["ARTS",2,"P",1],["P",1,"SC",1],["P",2,"SC",2],["P",3,"SC",3],["SCI",1,"BA",1]];
  for (const [i,link] of connections.entries()) {
    const a=graph.nodes.get(`${link.fromBuilding}|room:${link.fromRoom}`)!;
    const b=graph.nodes.get(`${link.toBuilding}|room:${link.toRoom}`)!;
    assert.deepEqual([a.buildingId,a.floor,b.buildingId,b.floor],expected[i]);
    assert.ok(readFileSync(new URL(`../public${link.source}`,import.meta.url)).length>1000);
  }
  for (const e of graph.edges) {
    const a=graph.nodes.get(e.from)!,b=graph.nodes.get(e.to)!;
    assert.ok(Number.isFinite(e.cost)&&e.cost>=0);
    if (a.buildingId!==b.buildingId) assert.equal(e.kind,"connection");
  }
});
test("Arts/Peters/Schlegel routes preserve floor offsets and elevator preference; DAWB stays isolated",()=>{
  const route=routeConnectedIndoors(buildings,connections,"ARTS1-concourse","SB305",true)!;
  assert.ok(route);assert.ok(route.edges.every(e=>e.kind!=="stairs"));
  assert.ok(route.edges.some(e=>e.kind==="elevator"));
  assert.deepEqual(new Set(route.nodes.map(n=>n.buildingId)),new Set(["ARTS","P","SC"]));
  assert.equal(routeConnectedIndoors(buildings,connections,"AW2-105","SB203",true),null);
  assert.equal(connections.some(c=>c.fromBuilding==="DAWB"||c.toBuilding==="DAWB"),false);
});
test("Science portal routes directly into Bricker and supports its upper floors",()=>{
  const direct=routeConnectedIndoors(originals,connections,"SCI1-bricker-connection","BA-science")!;
  assert.ok(direct);assert.equal(direct.edges.length,1);assert.equal(direct.edges[0].kind,"connection");
  const upstairs=routeConnectedIndoors(originals,connections,"N1000","BA316",true)!;
  assert.ok(upstairs);assert.ok(upstairs.edges.some(e=>e.kind==="elevator"));
  assert.ok(upstairs.edges.every(e=>e.kind!=="stairs"));
  assert.deepEqual(new Set(upstairs.nodes.map(n=>n.buildingId)),new Set(["SCI","BA"]));
});
test("Unconfirmed or missing building links never create routes by coordinate overlap", () => {
  const uncertain=connections.map(c=>({...c,status:"unconfirmed" as const}));
  assert.equal(routeConnectedIndoors(buildings,uncertain,"ARTS1-concourse","AW2-105"),null);
  assert.equal(routeConnectedIndoors(buildings,[],"ARTS1-concourse","P120"),null);
  assert.equal(routeConnectedIndoors(buildings,connections,"not-a-room","P120"),null);
  assert.equal(routeConnectedIndoors(buildings,connections,"ARTS1-concourse","DAWB5-private-north-0"),null);
});

test("Service Laurier is searchable as P107 beside the Peters elevator core",()=>{
  const floor=buildings.find(b=>b.id==="P")!.floors[0];
  const service=floor.rooms.find(r=>r.id==="P107")!;
  assert.match(service.name,/Service Laurier/);
  const lift=floor.rooms.find(r=>r.kind==="elevator")!;
  assert.ok(Math.hypot(service.door[0]-lift.door[0],service.door[1]-lift.door[1])<15);
  const arts=floor.rooms.find(r=>r.id==="P1-arts-link")!;
  assert.ok(Math.hypot(arts.door[0]-lift.door[0],arts.door[1]-lift.door[1])<8,"Arts must arrive at the core, not the remote office wing");
});
test("Upper Peters–Schlegel routes start at the elevator-side passage instead of the far office wing",()=>{
  for (const level of [2,3]) {
    const graph=buildConnectedIndoorGraph(buildings,connections);
    const route=shortestRoute(graph,`P|room:P${level}-lift`,`SC|room:SC${level}-peters-link`)!;
    assert.ok(route);assert.ok(route.nodes.every(n=>n.buildingId!=="P" || n.point[0]<5));
    assert.ok(route.estimatedSeconds!<35,`Floor ${level}: unnecessary office-wing detour`);
  }
});
