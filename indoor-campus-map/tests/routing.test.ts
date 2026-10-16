import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildIndoorGraph,
  projectToSegment,
  routeCampus,
  routeIndoors,
  shortestRoute,
} from "../src/routing.ts";
import type { IndoorBuilding, Point } from "../src/types.ts";
const buildings: IndoorBuilding[] = JSON.parse(
  readFileSync(new URL("../src/data/indoors.json", import.meta.url), "utf8"),
);
const campus = JSON.parse(
  readFileSync(new URL("../src/data/campus.json", import.meta.url), "utf8"),
);
for (const building of buildings) {
  test(`${building.name}: every mapped destination is reachable from its entrance`, () => {
    const graph = buildIndoorGraph(building);
    const start = building.floors.flatMap(f => f.rooms).find((r) => r.kind === "entrance" && r.routeable !== false)!;
    for (const f of building.floors)
      for (const room of f.rooms) {
        if (room.routeable === false) continue;
        const route = shortestRoute(
          graph,
          `room:${start.id}`,
          `room:${room.id}`,
        );
        assert.ok(route, `${room.id} disconnected`);
        assert.equal(route.nodes.at(-1)?.id, `room:${room.id}`);
      }
  });
  test(`${building.name}: elevator preference removes all stair transitions`, () => {
    const start = building.floors.flatMap(f => f.rooms).find((r) => r.kind === "entrance" && r.routeable !== false)!;
    const destination = building.floors.at(-1)!.rooms.find(
      (r) =>
        r.routeable !== false && (r.kind === "classroom" || r.kind === "lecture" || r.kind === "office" || r.kind === "study"),
    )!;
    const route = routeIndoors(building, start.id, destination.id, true);
    assert.ok(route);
    if (building.floors.length > 1) assert.ok(route.edges.some((e) => e.kind === "elevator"));
    assert.ok(route.edges.every((e) => e.kind !== "stairs"));
    assert.deepEqual([...new Set(route.nodes.map((n) => n.floor))], building.floors.filter(f => f.level >= (building.defaultFloor ?? 1)).map(f => f.level));
  });
  test(`${building.name}: graph edges have valid endpoints and finite positive cost`, () => {
    const graph = buildIndoorGraph(building);
    for (const e of graph.edges) {
      assert.ok(graph.nodes.has(e.from));
      assert.ok(graph.nodes.has(e.to));
      assert.ok(Number.isFinite(e.cost) && e.cost >= 0);
      if (e.kind !== "walk")
        assert.equal(
          Math.abs(
            graph.nodes.get(e.from)!.floor - graph.nodes.get(e.to)!.floor,
          ),
          1,
        );
    }
  });
}
test("Invalid destinations do not produce a route", () => {
  assert.equal(routeIndoors(buildings[0], "not-a-room", "BA101", false), null);
});
test('Unverified auditorium stairs are visible landmarks and cannot be routed through',()=>{
  const building=buildings[0];const graph=buildIndoorGraph(building);
  const markers=building.floors.flatMap(f=>f.rooms).filter(r=>r.routeable===false);
  assert.equal(markers.length,4);for(const marker of markers)assert.equal(graph.nodes.has(`room:${marker.id}`),false);
});
test('Elevator route endpoints align vertically across floors',()=>{
  for(const building of buildings){const lifts=building.floors.map(f=>f.rooms.find(r=>r.kind==='elevator')!);for(const lift of lifts.slice(1))assert.deepEqual(lift.door,lifts[0].door);}
});
test('Every destination door lies on its room boundary',()=>{
  for(const building of buildings)for(const floor of building.floors)for(const room of floor.rooms){
    const nearest=Math.min(...room.polygon.map((a,i)=>projectToSegment(room.door,a,room.polygon[(i+1)%room.polygon.length]).distance));assert.ok(nearest<.01,`${room.id}: door is not on boundary`);
  }
});
test("Disjoint corridor graphs fail cleanly", () => {
  const nodes = new Map([
    ["a", { id: "a", floor: 1, point: [0, 0] as Point }],
    ["b", { id: "b", floor: 1, point: [1, 1] as Point }],
  ]);
  assert.equal(shortestRoute({ nodes, edges: [] }, "a", "b"), null);
});
test("The closest point is clamped to segment endpoints", () => {
  assert.deepEqual(projectToSegment([20, 5], [0, 0], [10, 0]).point, [10, 0]);
  assert.deepEqual(projectToSegment([5, 5], [0, 0], [10, 0]).point, [5, 0]);
});
test("Indoor room IDs are globally unique and all mapped source plans exist", () => {
  const ids = buildings.flatMap((b) =>
    b.floors.flatMap((f) => f.rooms.map((r) => r.id)),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const b of buildings) {
    assert.deepEqual(
      b.floors.map((f) => f.level),
      b.id === "LIB" ? [1, 2, 3, 4, 5, 6, 7] : b.id === "SCI" ? [1] : [1, 2, 3],
    );
    for (const f of b.floors)
      assert.ok(
        readFileSync(new URL(`../public${f.blueprint}`, import.meta.url))
          .length > 1000,
      );
  }
});
test("Campus route uses mapped pedestrian connections between Lazaridis and Bricker", () => {
  const from = campus.places.find((p: { id: string }) => p.id === "LH").center,
    to = campus.places.find((p: { id: string }) => p.id === "BA").center;
  const route = routeCampus(campus, from, to, false);
  assert.ok(route, "Campus pedestrian graph does not connect these buildings");
  assert.ok(route.distance > 0);
});
test("Out-of-map locations fail without pretending they are on campus", () => {
  assert.equal(routeCampus(campus, [9999, 9999], [0, 0], false), null);
});

test("Library opens at Floor 2 and routes to Floor 7 through aligned elevators", () => {
  const library=buildings.find(b=>b.id==='LIB')!;
  assert.equal(library.defaultFloor,2);
  const route=routeIndoors(library,'LIB2-entrance','LIB7-707',true);
  assert.ok(route);assert.equal(route.nodes[0].floor,2);assert.equal(route.nodes.at(-1)?.floor,7);
  assert.equal(route.edges.filter(e=>e.kind==='elevator').length,5);
  assert.ok(route.edges.every(e=>e.kind!=='stairs'));
});
test("Staff library areas and ambiguous Lazaridis Floor 2 theatre cannot be routed to", () => {
  const library=buildings.find(b=>b.id==='LIB')!;
  assert.equal(routeIndoors(library,'LIB2-entrance','LIB1-technical',false),null);
  const laz=buildings.find(b=>b.id==='LH')!;
  assert.equal(routeIndoors(laz,'LH-entrance','LH2-oval',false),null);
  assert.ok(laz.floors[1].holes?.length===2);
  assert.ok(laz.floors[2].rooms.find(r=>r.id==='LH3094'));
});

test("Science opens from the campus map with three entrances and seven stairwells", () => {
  const science = buildings.find(b => b.id === "SCI")!;
  assert.ok(campus.places.find((p: {id: string; indoor: boolean}) => p.id === "SCI")?.indoor);
  assert.deepEqual(science.floors.map(f => f.level), [1]);
  const rooms = science.floors[0].rooms;
  assert.equal(rooms.filter(r => r.kind === "entrance").length, 3);
  assert.equal(rooms.filter(r => r.kind === "stairs").length, 7);
  assert.equal(rooms.filter(r => r.kind === "elevator").length, 0);
  for (const start of ["SCI1-entrance-a", "SCI1-entrance-b", "SCI1-bricker-connection"])
    for (const destination of ["N1001", "N1002", "N1042", "N1044", "N1057", "N1059", "SCI1-stairs-atrium", "SCI1-stairs-wing-end"])
      assert.ok(routeIndoors(science, start, destination, false), `${start} to ${destination} disconnected`);
  const graph = buildIndoorGraph(science);
  for (const room of rooms.filter(r => r.name === "Unverified room label"))
    assert.equal(graph.nodes.has(`room:${room.id}`), false);
  assert.ok(graph.edges.every(e => e.kind === "walk"), "The supplied single floor must not invent cross-floor routes");
});

test("Science routes stay out of other enclosed rooms along the way", () => {
  const science = buildings.find(b => b.id === "SCI")!;
  const rooms = science.floors[0].rooms;
  function inside(point: Point, polygon: Point[]) {
    let result = false;
    for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const a=polygon[i],b=polygon[j];
      if ((a[1]>point[1]) !== (b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]) result=!result;
    }
    return result;
  }
  const cuts = new Set<string>();
  for (const entrance of rooms.filter(r => r.kind === "entrance")) {
    for (const id of rooms.filter(r => r.routeable !== false && r.kind !== "entrance").map(r => r.id)) {
      const route=routeIndoors(science,entrance.id,id,false)!;
      for (let i=1;i<route.nodes.length;i++) {
        const a=route.nodes[i-1].point,b=route.nodes[i].point;
        for (let n=1;n<40;n++) {
          const point: Point=[a[0]+(b[0]-a[0])*n/40,a[1]+(b[1]-a[1])*n/40];
          for (const room of rooms) {
            if (room.id === entrance.id || room.id === id || room.open) continue;
            if (inside(point,room.polygon)) cuts.add(`${id} cuts through ${room.id}`);
          }
        }
      }
    }
  }
  assert.deepEqual([...cuts], []);
});

test("Interior corridor crossings allow the shortest turn without going to a remote endpoint",()=>{
  const building:IndoorBuilding={id:"TEST",name:"Crossing",source:"test",floors:[{level:1,label:"1",outline:[[-6,-6],[6,-6],[6,6],[-6,6]],blueprint:"",rooms:[],corridors:[[[-5,0],[5,0]],[[0,-5],[0,5]]]}]};
  const route=shortestRoute(buildIndoorGraph(building),"1:-5.000,0.000","1:0.000,5.000")!;
  assert.ok(route);assert.equal(route.distance,10);
  assert.ok(route.nodes.some(n=>n.point[0]===0 && n.point[1]===0));
});
test("Fastest routing accounts for one elevator boarding wait per continuous ride",()=>{
  const nodes=new Map([1,2,3].map(floor=>[String(floor),{id:String(floor),floor,point:[0,0] as Point}]));
  const lift=(from:string,to:string)=>({from,to,kind:"elevator" as const,cost:6,boardingSeconds:25,distanceMeters:0});
  const stairs=(from:string,to:string)=>({from,to,kind:"stairs" as const,cost:20,distanceMeters:0});
  const graph={nodes,edges:[lift("1","2"),lift("2","3"),stairs("1","2"),stairs("2","3")]};
  const one=shortestRoute(graph,"1","2")!,two=shortestRoute(graph,"1","3")!;
  assert.equal(one.estimatedSeconds,20);assert.equal(one.edges[0].kind,"stairs");
  assert.equal(two.estimatedSeconds,37);assert.ok(two.edges.every(e=>e.kind==="elevator"));
  const preferred=shortestRoute(graph,"1","2",true)!;
  assert.equal(preferred.estimatedSeconds,31);assert.equal(preferred.edges[0].kind,"elevator");
});
test("Different arrival states at an elevator retain the fastest continuation",()=>{
  const nodes=new Map([1,2,3].map(floor=>[String(floor),{id:String(floor),floor,point:[0,0] as Point}]));
  const graph={nodes,edges:[
    {from:"1",to:"2",kind:"walk" as const,cost:7,distanceMeters:9.1},
    {from:"1",to:"2",kind:"elevator" as const,cost:6,boardingSeconds:25,distanceMeters:0},
    {from:"2",to:"3",kind:"elevator" as const,cost:6,boardingSeconds:25,distanceMeters:0},
  ]};
  const route=shortestRoute(graph,"1","3")!;
  assert.equal(route.estimatedSeconds,37);assert.ok(route.edges.every(e=>e.kind==="elevator"));
});
test("Time optimization may choose a longer walk when the alternative has a slower lift",()=>{
  const nodes=new Map(["a","b","c"].map(id=>[id,{id,floor:1,point:[0,0] as Point}]));
  const route=shortestRoute({nodes,edges:[
    {from:"a",to:"c",kind:"elevator",cost:6,boardingSeconds:25,distanceMeters:0},
    {from:"a",to:"b",kind:"walk",cost:10,distanceMeters:13},
    {from:"b",to:"c",kind:"walk",cost:10,distanceMeters:13},
  ]},"a","c")!;
  assert.equal(route.estimatedSeconds,20);assert.equal(route.distanceMeters,26);
  assert.deepEqual(route.nodes.map(n=>n.id),["a","b","c"]);
});
test("Campus endpoints on one path snap to its interior and route directly",()=>{
  const data={walkNodes:{a:[0,0] as Point,b:[10,0] as Point},walkEdges:[{fromId:"a",toId:"b",stairs:false,road:false}]};
  const route=routeCampus(data,[1,1],[9,1],false)!;
  assert.ok(route);assert.equal(route.distanceMeters,32);
  assert.deepEqual(route.nodes.map(n=>n.point),[[1,0],[9,0]]);
  assert.equal(routeCampus({...data,walkEdges:[{...data.walkEdges[0],road:true}]},[1,1],[9,1],false),null);
  assert.equal(routeCampus({...data,walkEdges:[{...data.walkEdges[0],stairs:true}]},[1,1],[9,1],true),null);
});

test("Library to Athletic Complex uses permitted campus lanes without the Bricker detour",()=>{
  const from=campus.entrances.LIB.find((d:{main:boolean})=>d.main).point;
  const to=campus.entrances.AC[0].point;
  const route=routeCampus(campus,from,to,false)!;
  assert.ok(route);assert.ok(route.distanceMeters!<600);
  const old=routeCampus({...campus,walkEdges:campus.walkEdges.map((e: {pedestrianAllowed?:boolean})=>({...e,pedestrianAllowed:false}))},from,to,false)!;
  assert.ok(old.distanceMeters!-route.distanceMeters!>150);
  assert.ok(route.nodes.every(n=>n.point[1]<20),"route should not detour south to Bricker");
  for(let i=0;i<route.edges.length;i++){
    const a=route.nodes[i].point,b=route.nodes[i+1].point;
    assert.ok(campus.walkEdges.some((e:{fromId:string;toId:string;road:boolean;pedestrianAllowed?:boolean})=>
      (!e.road||e.pedestrianAllowed)&&projectToSegment(a,campus.walkNodes[e.fromId],campus.walkNodes[e.toId]).distance<.001&&projectToSegment(b,campus.walkNodes[e.fromId],campus.walkNodes[e.toId]).distance<.001),"every route leg must follow a mapped pedestrian segment");
  }
});
test("Near-coincident path snaps evaluate connected alternatives",()=>{
  const data={walkNodes:{a:[0,0] as Point,b:[10,0] as Point,c:[0,.1] as Point,d:[10,.1] as Point,e:[20,.1] as Point},walkEdges:[
    {fromId:"a",toId:"b",stairs:false,road:false},{fromId:"c",toId:"d",stairs:false,road:false},{fromId:"d",toId:"e",stairs:false,road:false}
  ]};
  const route=routeCampus(data,[1,0],[19,.1],false)!;
  assert.ok(route);assert.ok(route.nodes.some(n=>n.id==="d"));
  assert.ok(Math.abs(route.distanceMeters!-72)<1e-6);
});
