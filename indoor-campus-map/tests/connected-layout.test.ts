import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { displayFloor, displayNode, displayPoint, metresBetween, floorAtLevel, sameIndoorView, sharedLevel } from "../src/connected-layout.ts";
import { routeConnectedIndoors } from "../src/routing.ts";
import type { IndoorBuilding, IndoorConnection } from "../src/types.ts";
const buildings: IndoorBuilding[] = [...JSON.parse(readFileSync(new URL("../src/data/new-indoors.json",import.meta.url),"utf8")), ...JSON.parse(readFileSync(new URL("../src/data/indoors.json",import.meta.url),"utf8")).filter((b: IndoorBuilding)=>["SCI","BA"].includes(b.id))];
const connections: IndoorConnection[] = JSON.parse(readFileSync(new URL("../src/data/indoor-connections.json",import.meta.url),"utf8"));
test("Each connecting door pair occupies the same displayed level with its source floor number preserved", () => {
  for (const link of connections) {
    const a = buildings.find(b => b.id === link.fromBuilding)!;
    const b = buildings.find(b => b.id === link.toBuilding)!;
    const af = a.floors.find(f => f.rooms.some(r => r.id === link.fromRoom))!;
    const bf = b.floors.find(f => f.rooms.some(r => r.id === link.toRoom))!;
    assert.equal(sharedLevel(a.id,af.level),sharedLevel(b.id,bf.level));
  }
  assert.equal(floorAtLevel(buildings.find(b=>b.id==="P")!,2)?.level,1);
  assert.equal(floorAtLevel(buildings.find(b=>b.id==="ARTS")!,2)?.level,2);
  assert.equal(floorAtLevel(buildings.find(b=>b.id==="P")!,1),undefined);
});
test("Campus registration preserves IDs and source data, with routing distances measured in the same frame", () => {
  const snapshot = JSON.stringify(buildings);
  for (const b of buildings) for (const floor of b.floors) {
    const display = displayFloor(b.id,floor);
    for (const [i,r] of floor.rooms.entries()) {
      assert.equal(display.rooms[i].id,r.id);
      assert.deepEqual(display.rooms[i].door,displayPoint(b.id,r.door,floor.level));
      const local = metresBetween(b.id,floor.level,r.center,r.door);
      const world = Math.hypot(display.rooms[i].center[0]-display.rooms[i].door[0],display.rooms[i].center[1]-display.rooms[i].door[1]);
      assert.ok(Math.abs(local-world)<1e-9);
    }
  }
  assert.equal(JSON.stringify(buildings),snapshot);
  assert.ok(sameIndoorView("ARTS","P"));
  assert.ok(sameIndoorView("P","SC"));
  assert.equal(sameIndoorView("SC","DAWB"),false);
  assert.ok(sameIndoorView("SCI","BA"));
  assert.equal(sameIndoorView("P","SCI"),false);
  assert.equal(sameIndoorView("ARTS","BA"),false);
});
test("A cross-wing route renders in the same coordinates and levels as its destination rooms", () => {
  const route = routeConnectedIndoors(buildings,connections,"ARTS2-peters-link","SC1-peters-link",false)!;
  assert.ok(route);
  const nodes = route.nodes.map(displayNode);
  assert.deepEqual(new Set(nodes.map(n=>n.floor)),new Set([2]));
  for (const node of nodes) {
    const original = route.nodes.find(n=>n.id===node.id)!;
    assert.deepEqual(node.point,displayPoint(node.buildingId!,original.point,original.floor));
  }
  assert.equal(displayNode({id:"outside",floor:0,point:[1,2]}).floor,0);
});

test("The geographic complex has Arts right, Peters central, Schlegel left, DAWB below in the chosen view",()=>{
  const anchors=Object.fromEntries(buildings.map(b=>[b.id,displayPoint(b.id,[0,0],1)]));
  assert.ok(anchors.SC[0]<anchors.P[0]);assert.ok(anchors.P[0]<anchors.ARTS[0]);
  assert.ok(anchors.DAWB[1]>anchors.P[1]);
  for (const b of buildings) for (const floor of b.floors) {
    assert.deepEqual(displayPoint(b.id,[0,0],floor.level),anchors[b.id],`${b.id} shaft must not drift between levels`);
  }
});

test("Peters registration preserves right angles and a consistent bearing on all three floors",()=>{
  const axes = (floor: number) => {
    const o=displayPoint("P",[0,0],floor),a=displayPoint("P",[10,0],floor),b=displayPoint("P",[0,10],floor);
    return {x:[a[0]-o[0],a[1]-o[1]],y:[b[0]-o[0],b[1]-o[1]]};
  };
  const base=axes(1);
  for(const floor of [1,2,3]){
    const {x,y}=axes(floor);
    assert.ok(Math.abs(x[0]*y[0]+x[1]*y[1])<1e-6,"registration must not shear the source plan");
    assert.ok(Math.abs(x[0]*base.x[1]-x[1]*base.x[0])<1e-6,"bearing must stay aligned between floors");
  }
});
