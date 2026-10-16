import { routeCampusPlaces, YOUR_LOCATION } from "./campus-directions.ts";
import type { DirectionsCampus } from "./campus-directions.ts";
import { travelTime } from "./routing.ts";
import type { Point, Route, RouteEdge, RouteNode } from "./types.ts";

export interface IndoorCampusNetwork {
  links: { from: string; to: string; status: string; artsLevelChange?: boolean; via?: string }[];
  exits: Record<string, { nodeId: string; label: string; enterLabel?: string }>;
}
type Leg = { to: string; route: Route; outside: number };
type Score = { outside: number; seconds: number };
const outdoorCache = new WeakMap<DirectionsCampus, Map<string, Route | null>>();
const metres = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) * 4;

// Indoor links are a topology overview: their time uses footprint-centre gaps,
// not invented door coordinates or a surveyed corridor trace.
export function routeCampusJourney(
  data: DirectionsCampus, network: IndoorCampusNetwork,
  from: string, to: string, location: Point | null, avoidStairs: boolean,
  preferIndoors = false,
): Route | null {
  const place = (id: string) => data.places.find(p => p.id === id);
  if (!from || !to || from === to) return null;
  const startBuilding = place(from)?.locationBuildingId ?? from;
  const endBuilding = place(to)?.locationBuildingId ?? to;
  if (startBuilding !== from || endBuilding !== to) {
    const route = routeCampusJourney(data, network, startBuilding, endBuilding, location, avoidStairs, preferIndoors);
    if (!route) return null;
    return { ...route, nodes: route.nodes.map((n, i) => ({ ...n,
      label: i === 0 && startBuilding !== from ? `${place(from)!.name} · ${place(startBuilding)!.name} · building access`
        : i === route.nodes.length - 1 && endBuilding !== to ? `${place(to)!.name} · ${place(endBuilding)!.name} · building access` : n.label,
    })) };
  }
  if ([from, to].some(id => id === YOUR_LOCATION ? !location : !place(id))) return null;
  const links = network.links.filter(l => l.status === "supported" && place(l.from) && place(l.to));
  const inside = new Set(links.flatMap(l => [l.from, l.to]));
  const ids = [...new Set([from, to, ...inside])].sort();
  const label = (id: string) => id === "ARTS-E" ? "Concourse / Arts E Wing" : id === YOUR_LOCATION ? "Your location" : place(id)!.name;
  const node = (id: string): RouteNode => ({ id, floor: 0, point: id === YOUR_LOCATION ? location! : place(id)!.center, label: label(id), placeId: id });
  const adjacency = new Map<string, Leg[]>(ids.map(id => [id, []]));
  const add = (a: string, b: string, route: Route, outside: number) => adjacency.get(a)!.push({ to: b, route, outside });
  const indoorEdge = (a: RouteNode, b: RouteNode, instruction: string, extraSeconds = 0): RouteEdge => {
    const distanceMeters = metres(a.point, b.point);
    return { from: a.id, to: b.id, kind: "indoor", instruction, distanceMeters, drawingDistance: distanceMeters / 4, cost: distanceMeters / travelTime.walkingMetresPerSecond + extraSeconds };
  };
  for (const link of links) {
    for (const [a, b] of [[link.from, link.to], [link.to, link.from]]) {
      const start = node(a), end = node(b);
      const levelChange = link.artsLevelChange
        ? avoidStairs ? travelTime.elevatorBoardingSeconds + travelTime.elevatorSecondsPerFloor : travelTime.stairsSecondsPerFloor
        : 0;
      const instruction = `Stay indoors${link.via ? ` through ${link.via}` : ""} into ${label(b)}.${link.artsLevelChange ? ` Change levels in Arts using the ${avoidStairs ? "elevator" : "stairs"}.` : ""}`;
      const edge = indoorEdge(start, end, instruction, travelTime.doorwaySeconds + levelChange);
      add(a, b, { nodes: [start, end], edges: [edge], distance: edge.drawingDistance!, distanceMeters: edge.distanceMeters, estimatedSeconds: edge.cost }, 0);
    }
  }

  // The indoor preference follows the confirmed music underpass passage.
  // Fastest routing also considers the other existing mapped entrances.
  const exitDoors = { ...data.entrances };
  for (const [id, exit] of Object.entries(preferIndoors ? network.exits : {})) {
    const doors = data.entrances[id] as ({ point: Point; main: boolean; nodeId?: string }[] | undefined);
    const match = doors?.find(d => d.nodeId === exit.nodeId);
    if (match) exitDoors[id] = [match];
  }
  const exitData = { ...data, entrances: exitDoors };
  const cached = outdoorCache.get(data) ?? new Map<string, Route | null>();
  outdoorCache.set(data, cached);
  const accessOrigins = Object.fromEntries([...inside].filter(id => id !== from && id !== to).map(id => [id, place(id)!.center]));
  const cacheContext = JSON.stringify([network.exits, avoidStairs, preferIndoors]);
  const exitInstruction = (id: string, point: Point | undefined, entering: boolean) => {
    const exit = network.exits[id];
    const match = exit && (data.entrances[id] as ({ point: Point; nodeId?: string }[] | undefined))?.find(d => d.nodeId === exit.nodeId);
    return point && match && metres(point, match.point) < .01
      ? entering ? exit.enterLabel : exit.label : undefined;
  };
  const wrap = (core: Route, a: string, b: string): Route => {
    const nodes = core.nodes.map(n => ({ ...n }));
    const edges = core.edges.map(e => ({ ...e }));
    // A building endpoint can start/finish at a mapped entrance. Intermediate
    // transfers must include walking between that entrance and the indoor link.
    if (inside.has(a) && a !== from && a !== to) {
      const start = node(a), first = nodes[0];
      edges.unshift(indoorEdge(start, first, exitInstruction(a, core.departureAccess, false) ?? `Go outside from ${label(a)} to the mapped walking path.`));
      nodes.unshift(start);
    }
    if (inside.has(b) && b !== from && b !== to) {
      const end = node(b), last = nodes.at(-1)!;
      edges.push(indoorEdge(last, end, exitInstruction(b, core.arrivalAccess, true) ?? `Enter ${label(b)} from the mapped walking path.`));
      nodes.push(end);
    }
    return { nodes, edges, distance: edges.reduce((s, e) => s + (e.drawingDistance ?? 0), 0), distanceMeters: edges.reduce((s, e) => s + (e.distanceMeters ?? 0), 0), estimatedSeconds: edges.reduce((s, e) => s + e.cost, 0) };
  };
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    // Reuse unchanged legs across endpoint changes and reversed journeys.
    const cacheKey = `${cacheContext}:${a}:${b}:${JSON.stringify([accessOrigins[a], accessOrigins[b], a === YOUR_LOCATION || b === YOUR_LOCATION ? location : null])}`;
    let core = cached.get(cacheKey);
    if (core === undefined) {
      core = routeCampusPlaces(exitData, a, b, location, avoidStairs, { accessOrigins, preferDistance: preferIndoors });
      cached.set(cacheKey, core);
    }
    if (!core) continue;
    add(a, b, wrap(core, a, b), core.distanceMeters!);
    const reverse = { ...core, departureAccess: core.arrivalAccess, arrivalAccess: core.departureAccess, nodes: [...core.nodes].reverse(), edges: [...core.edges].reverse().map(e => ({ ...e, from: e.to, to: e.from })) };
    add(b, a, wrap(reverse, b, a), core.distanceMeters!);
  }

  const less = (a: Score, b: Score) => preferIndoors && Math.abs(a.outside - b.outside) > .001 ? a.outside < b.outside : a.seconds < b.seconds;
  const scores = new Map<string, Score>([[from, { outside: 0, seconds: 0 }]]);
  const pending = new Set([from]), visited = new Set<string>();
  const previous = new Map<string, { from: string; leg: Leg }>();
  while (pending.size) {
    const current = [...pending].sort((a, b) => less(scores.get(a)!, scores.get(b)!) ? -1 : 1)[0];
    pending.delete(current);
    if (current === to) break;
    visited.add(current);
    for (const leg of adjacency.get(current)!) {
      if (visited.has(leg.to)) continue;
      const score = { outside: scores.get(current)!.outside + leg.outside, seconds: scores.get(current)!.seconds + leg.route.estimatedSeconds! };
      if (!scores.has(leg.to) || less(score, scores.get(leg.to)!)) {
        scores.set(leg.to, score);
        previous.set(leg.to, { from: current, leg });
        pending.add(leg.to);
      }
    }
  }
  if (!scores.has(to)) return null;
  const parts: Route[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = previous.get(cursor);
    if (!step) return null;
    parts.unshift(step.leg.route);
    cursor = step.from;
  }
  const nodes: RouteNode[] = [], edges: RouteEdge[] = [];
  for (const part of parts) {
    if (!nodes.length) nodes.push({ ...part.nodes[0], id: "journey:0" });
    for (let i = 0; i < part.edges.length; i++) {
      const next = { ...part.nodes[i + 1], id: `journey:${nodes.length}` };
      edges.push({ ...part.edges[i], from: nodes.at(-1)!.id, to: next.id });
      nodes.push(next);
    }
  }
  return {
    nodes, edges, preference: preferIndoors ? "indoors" : "fastest", indoorOverview: edges.some(e => e.kind === "indoor"),
    outdoorDistanceMeters: scores.get(to)!.outside, estimatedSeconds: scores.get(to)!.seconds,
    distanceMeters: edges.reduce((s, e) => s + (e.distanceMeters ?? 0), 0),
    distance: edges.reduce((s, e) => s + (e.drawingDistance ?? 0), 0),
  };
}

export function routeMostlyIndoors(
  data: DirectionsCampus, network: IndoorCampusNetwork,
  from: string, to: string, location: Point | null, avoidStairs: boolean,
): Route | null {
  return routeCampusJourney(data, network, from, to, location, avoidStairs, true);
}
