import { displayPoint, isSharedBuilding, metresBetween } from "./connected-layout.ts";
import type {
  IndoorBuilding,
  IndoorConnection,
  Point,
  Route,
  RouteEdge,
  RouteNode,
} from "./types.ts";

// Prototype assumptions; no live lift queues or measured walking times.
export const travelTime = { walkingMetresPerSecond: 1.3, stairsSecondsPerFloor: 20, elevatorSecondsPerFloor: 6, elevatorBoardingSeconds: 25, doorwaySeconds: 2 };
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const key = (floor: number, p: Point) =>
  `${floor}:${p.map((v) => v.toFixed(3)).join(",")}`;
export function projectToSegment(
  p: Point,
  a: Point,
  b: Point,
): { point: Point; t: number; distance: number } {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1),
    ),
  );
  const point: Point = [a[0] + t * dx, a[1] + t * dz];
  return { point, t, distance: distance(p, point) };
}
export interface Graph {
  nodes: Map<string, RouteNode>;
  edges: RouteEdge[];
}
export function buildIndoorGraph(building: IndoorBuilding): Graph {
  const nodes = new Map<string, RouteNode>(),
    edges: RouteEdge[] = [];
  const connectors = new Map<string, RouteNode[]>();
  const add = (floor: number, point: Point) => {
    const id = key(floor, point);
    if (!nodes.has(id)) nodes.set(id, { id, floor, point, buildingId: building.id });
    return id;
  };
  const edge = (
    from: string,
    to: string,
    kind: RouteEdge["kind"] = "walk",
    cost?: number,
  ) => {
    if (from !== to)
      edges.push({
        from,
        to,
        kind,
        cost: cost ?? metresBetween(building.id,nodes.get(from)!.floor,nodes.get(from)!.point,nodes.get(to)!.point)/travelTime.walkingMetresPerSecond,
        distanceMeters: kind === "walk" ? metresBetween(building.id,nodes.get(from)!.floor,nodes.get(from)!.point,nodes.get(to)!.point) : 0,
        drawingDistance: kind === "walk" ? distance(nodes.get(from)!.point,nodes.get(to)!.point) : 0,
        boardingSeconds: kind === "elevator" ? travelTime.elevatorBoardingSeconds : undefined,
      });
  };
  for (const floor of building.floors) {
    const segments = floor.corridors.flatMap((line) =>
      line.slice(1).map((b, i) => ({
        a: line[i],
        b,
        points: [
          { point: line[i], t: 0 },
          { point: b, t: 1 },
        ],
      })),
    );
    // Split true interior crossings as well as collinear/end-point junctions.
    // A visual crossing must allow a turn, even if neither polyline ends there.
    for (let i=0;i<segments.length;i++) for (let j=i+1;j<segments.length;j++) {
      const a=segments[i], b=segments[j];
      const ax=a.b[0]-a.a[0], ay=a.b[1]-a.a[1], bx=b.b[0]-b.a[0], by=b.b[1]-b.a[1];
      const cross=ax*by-ay*bx;
      if (Math.abs(cross)<1e-9) continue;
      const dx=b.a[0]-a.a[0], dy=b.a[1]-a.a[1];
      const t=(dx*by-dy*bx)/cross, u=(dx*ay-dy*ax)/cross;
      if (t>=0 && t<=1 && u>=0 && u<=1) {
        const point: Point=[a.a[0]+t*ax,a.a[1]+t*ay];
        a.points.push({point,t});b.points.push({point,t:u});
      }
    }
    for (const segment of segments)
      for (const other of segments)
        for (const point of [other.a, other.b]) {
          const p = projectToSegment(point, segment.a, segment.b);
          if (p.distance < 0.001)
            segment.points.push({ point: p.point, t: p.t });
        }
    for (const room of floor.rooms) {
      if (room.routeable === false) continue;
      const candidates = segments
        .map((seg, i) => ({ ...projectToSegment(room.door, seg.a, seg.b), i }))
        .sort((a, b) => a.distance - b.distance);
      if (!candidates.length) continue;
      const nearest = candidates[0];
      segments[nearest.i].points.push({ point: nearest.point, t: nearest.t });
      const id = `room:${room.id}`;
      const node: RouteNode = {
        id,
        floor: floor.level,
        point: room.door,
        label: room.name,
        kind: room.kind,
        buildingId: building.id,
      };
      nodes.set(id, node);
      edge(id, add(floor.level, nearest.point));
      if (room.connector)
        connectors.set(room.connector, [
          ...(connectors.get(room.connector) ?? []),
          node,
        ]);
    }
    for (const segment of segments) {
      segment.points.sort((a, b) => a.t - b.t);
      for (let i = 1; i < segment.points.length; i++)
        edge(
          add(floor.level, segment.points[i - 1].point),
          add(floor.level, segment.points[i].point),
        );
    }
  }
  for (const linked of connectors.values()) {
    linked.sort((a, b) => a.floor - b.floor);
    for (let i = 1; i < linked.length; i++) {
      const a = linked[i - 1],
        b = linked[i];
      if (b.floor - a.floor !== 1) continue;
      edge(
        a.id,
        b.id,
        a.kind === "elevator" ? "elevator" : "stairs",
        a.kind === "elevator" ? travelTime.elevatorSecondsPerFloor : travelTime.stairsSecondsPerFloor,
      );
    }
  }
  return { nodes, edges };
}
// Only named, supported transitions link buildings; proximity never creates a door.
// Only named, source-supported door pairs become transitions in this graph.
export function buildConnectedIndoorGraph(
  buildings: IndoorBuilding[],
  connections: IndoorConnection[],
): Graph {
  const nodes = new Map<string, RouteNode>();
  const edges: RouteEdge[] = [];
  for (const building of buildings) {
    const graph = buildIndoorGraph(building);
    const prefix = (id: string) => `${building.id}|${id}`;
    for (const node of graph.nodes.values()) nodes.set(prefix(node.id), { ...node, id: prefix(node.id) });
    edges.push(...graph.edges.map(e => ({ ...e, from: prefix(e.from), to: prefix(e.to) })));
  }
  for (const connection of connections) {
    if (connection.status !== "source-shown") continue;
    const from = `${connection.fromBuilding}|room:${connection.fromRoom}`;
    const to = `${connection.toBuilding}|room:${connection.toRoom}`;
    if (nodes.has(from) && nodes.has(to)) {
      const a=nodes.get(from)!, b=nodes.get(to)!;
      const gap=isSharedBuilding(a.buildingId) && isSharedBuilding(b.buildingId)
        ? distance(displayPoint(a.buildingId!,a.point,a.floor),displayPoint(b.buildingId!,b.point,b.floor)) : 0;
      edges.push({ from, to, kind: "connection", cost: gap/travelTime.walkingMetresPerSecond+travelTime.doorwaySeconds, distanceMeters: gap, drawingDistance: 0 });
    }
  }
  return { nodes, edges };
}
export function routeConnectedIndoors(
  buildings: IndoorBuilding[], connections: IndoorConnection[],
  from: string, to: string, stepFree = false,
) {
  const owner = (roomId: string) => buildings.find(b => b.floors.some(f => f.rooms.some(r => r.id === roomId)));
  const start = owner(from), end = owner(to);
  if (!start || !end) return null;
  return shortestRoute(buildConnectedIndoorGraph(buildings, connections), `${start.id}|room:${from}`, `${end.id}|room:${to}`, stepFree);
}
export function shortestRoute(
  graph: Graph,
  from: string,
  to: string,
  stepFree = false,
): Route | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null;
  const adjacency = new Map<string, { id: string; edge: RouteEdge }[]>();
  for (const e of graph.edges) {
    if (stepFree && e.kind === "stairs") continue;
    adjacency.set(e.from, [
      ...(adjacency.get(e.from) ?? []),
      { id: e.to, edge: e },
    ]);
    adjacency.set(e.to, [
      ...(adjacency.get(e.to) ?? []),
      { id: e.from, edge: { ...e, from: e.to, to: e.from } },
    ]);
  }
  // Lift state prevents charging a boarding wait at every intermediate floor,
  // while still allowing a different arrival state to yield a faster continuation.
  const stateKey=(id: string,lift: boolean)=>JSON.stringify([id,lift]);
  const start=stateKey(from,false);
  const states=new Map([[start,{id:from,lift:false}]]);
  const scores=new Map([[start,0]]), pending=new Set([start]), visited=new Set<string>();
  const previous=new Map<string,{state:string;edge:RouteEdge}>();
  let finish: string | undefined;
  while (pending.size) {
    const current=[...pending].sort((a,b)=>scores.get(a)!-scores.get(b)!)[0];
    pending.delete(current);
    const state=states.get(current)!;
    if (state.id===to) { finish=current; break; }
    visited.add(current);
    for (const neighbor of adjacency.get(state.id) ?? []) {
      const lift=neighbor.edge.kind==="elevator";
      const next=stateKey(neighbor.id,lift);
      if (visited.has(next)) continue;
      const edge={...neighbor.edge,cost:neighbor.edge.cost+(lift && !state.lift ? neighbor.edge.boardingSeconds ?? 0 : 0)};
      const score=scores.get(current)!+edge.cost;
      if (score<(scores.get(next) ?? Infinity)) {
        states.set(next,{id:neighbor.id,lift});scores.set(next,score);
        previous.set(next,{state:current,edge});pending.add(next);
      }
    }
  }
  if (!finish) return null;
  const routeEdges: RouteEdge[]=[];
  let cursor=finish;
  while (cursor!==start) {
    const step=previous.get(cursor);
    if (!step) return null;
    routeEdges.unshift(step.edge);cursor=step.state;
  }
  const timed=routeEdges.every(e=>e.distanceMeters!==undefined);
  return {
    nodes:[graph.nodes.get(from)!,...routeEdges.map(e=>graph.nodes.get(e.to)!)],
    edges:routeEdges,
    distance:routeEdges.filter(e=>e.kind==="walk").reduce((sum,e)=>sum+(e.drawingDistance ?? e.cost),0),
    distanceMeters:timed ? routeEdges.reduce((sum,e)=>sum+e.distanceMeters!,0) : undefined,
    estimatedSeconds:timed ? scores.get(finish)! : undefined,
  };
}
export function routeIndoors(
  building: IndoorBuilding,
  from: string,
  to: string,
  stepFree: boolean,
) {
  return shortestRoute(
    buildIndoorGraph(building),
    `room:${from}`,
    `room:${to}`,
    stepFree,
  );
}
export function routeCampus(
  data: {
    walkNodes: Record<string, Point>;
    walkEdges: {
      fromId: string;
      toId: string;
      stairs: boolean;
      road: boolean;
      pedestrianAllowed?: boolean;
    }[];
  },
  from: Point,
  to: Point,
  stepFree: boolean,
): Route | null {
  const nodes = new Map<string, RouteNode>(
    Object.entries(data.walkNodes).map(([id, point]) => [
      id,
      { id, point, floor: 0 },
    ]),
  );
  // Snap to an eligible pedestrian segment, not a distant endpoint. Split both
  // projections together so two locations on the same edge can walk directly.
  const segments=data.walkEdges.filter(e=>(!e.road || e.pedestrianAllowed) && !(stepFree && e.stairs)).flatMap(e=>{
    const a=nodes.get(e.fromId), b=nodes.get(e.toId);
    return a && b ? [{...e,a:a.point,b:b.point,points:[{id:e.fromId,t:0},{id:e.toId,t:1}]}] : [];
  });
  const accessEdges: RouteEdge[]=[];
  const attach=(p:Point,id:string)=>{
    const projections=segments.map((segment,i)=>({...projectToSegment(p,segment.a,segment.b),i})).sort((a,b)=>a.distance-b.distance);
    const nearest=projections[0];
    if (!nearest || nearest.distance>25) return false;
    nodes.set(id,{id,point:p,floor:0});
    // Near-coincident segments can belong to different components. Evaluate all
    // within one metre of the closest projection, rather than a single arbitrary edge.
    for (const q of projections.filter(q=>q.distance<=nearest.distance+.25).slice(0,12)) {
      const accessId=`${id}:${q.i}`;
      nodes.set(accessId,{id:accessId,point:q.point,floor:0});
      segments[q.i].points.push({id:accessId,t:q.t});
      const distanceMeters=q.distance*4;
      accessEdges.push({from:id,to:accessId,kind:"walk",cost:distanceMeters/travelTime.walkingMetresPerSecond,distanceMeters,drawingDistance:q.distance});
    }
    return true;
  };
  if (!attach(from,"route-start") || !attach(to,"route-end")) return null;
  const edges:RouteEdge[]=[];
  for (const segment of segments) {
    segment.points.sort((a,b)=>a.t-b.t);
    for (let i=1;i<segment.points.length;i++) {
      const a=segment.points[i-1].id,b=segment.points[i].id;
      const drawingDistance=distance(nodes.get(a)!.point,nodes.get(b)!.point), distanceMeters=drawingDistance*4;
      edges.push({from:a,to:b,kind:segment.stairs ? "stairs" : "walk",cost:distanceMeters/travelTime.walkingMetresPerSecond*(segment.stairs ? 1.5 : 1),drawingDistance,distanceMeters});
    }
  }
  const route=shortestRoute({nodes,edges:[...edges,...accessEdges]},"route-start","route-end",stepFree);
  if (!route) return null;
  // Display only supported path segments, not a guessed straight line from a
  // building centre or GPS fix across a wall/lawn to its nearest path.
  const access=route.edges[0],exit=route.edges.at(-1)!;
  return {...route,nodes:route.nodes.slice(1,-1),edges:route.edges.slice(1,-1),
    distance:route.distance-(access.drawingDistance??0)-(exit.drawingDistance??0),
    distanceMeters:(route.distanceMeters??0)-(access.distanceMeters??0)-(exit.distanceMeters??0),
    estimatedSeconds:(route.estimatedSeconds??0)-access.cost-exit.cost};
}
