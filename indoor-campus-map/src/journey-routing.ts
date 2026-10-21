import { routeConnectedIndoors } from './routing.ts';
import { routeCampusJourney } from './sheltered-routing.ts';
import type { IndoorCampusNetwork } from './sheltered-routing.ts';
import type { DirectionsCampus } from './campus-directions.ts';
import type { IndoorBuilding, IndoorConnection, Point, Route } from './types.ts';

/** Indoor plans and campus paths have separate coordinates. Transfers are instructions,
 * never invented lines joining an unsurveyed indoor door to an outdoor access point. */
export function routeJourney(data: DirectionsCampus, network: IndoorCampusNetwork, buildings: IndoorBuilding[], connections: IndoorConnection[], from: string, to: string, location: Point | null, avoidStairs = false, preferIndoors = false): Route | null {
 const owner = (id: string) => buildings.find(b => b.floors.some(f => f.rooms.some(r => r.id === id && r.routeable !== false)));
 const start = owner(from), end = owner(to);
 if (start && end) {
  const connected = routeConnectedIndoors(buildings,connections,from,to,avoidStairs);
  if (connected) return connected;
 }
 const campusId = (building: IndoorBuilding) => data.places.find(p => p.id === building.id)?.id ?? data.places.find(p => building.campusIds?.includes(p.id))?.id;
 const accessLeg = (building: IndoorBuilding, room: string, departing: boolean) => {
  const candidates = building.floors.flatMap(f => f.rooms).filter(r => r.kind === 'entrance' && r.routeable !== false)
   .map(r => routeConnectedIndoors([building],[],departing ? room : r.id,departing ? r.id : room,avoidStairs)).filter((r): r is Route => !!r);
  return candidates.sort((a,b) => (a.estimatedSeconds ?? Infinity)-(b.estimatedSeconds ?? Infinity))[0] ?? null;
 };
 const departure = start ? accessLeg(start,from,true) : null;
 const arrival = end ? accessLeg(end,to,false) : null;
 if (start && !departure || end && !arrival) return null;
 const outsideFrom = start ? campusId(start) : from;
 const outsideTo = end ? campusId(end) : to;
 if (!outsideFrom || !outsideTo || outsideFrom === outsideTo) return null;
 const outside = routeCampusJourney(data,network,outsideFrom,outsideTo,location,avoidStairs,preferIndoors);
 if (!outside) return null;
 const parts = [departure,outside,arrival].filter((r): r is Route => !!r);
 if (parts.length === 1) return outside;
 const result: Route = {nodes:[],edges:[],distance:0,distanceMeters:0,estimatedSeconds:0,outdoorDistanceMeters:outside.outdoorDistanceMeters ?? outside.distanceMeters,indoorOverview:outside.indoorOverview,preference:outside.preference,hasUnmeasuredAccess:true};
 for (const part of parts) {
  const previous = result.nodes.at(-1), next = part.nodes[0];
  if (previous) result.edges.push({from:previous.id,to:next.id,kind:'transfer',cost:0,instruction:next.buildingId ? `Enter ${end!.name}; confirm the mapped entrance on Floor ${next.floor}` : `Exit ${start!.name}; continue to the mapped campus path. Check door access`});
  result.nodes.push(...part.nodes); result.edges.push(...part.edges);
  result.distance += part.distance; result.distanceMeters! += part.distanceMeters ?? 0; result.estimatedSeconds! += part.estimatedSeconds ?? 0;
 }
 return result;
}
