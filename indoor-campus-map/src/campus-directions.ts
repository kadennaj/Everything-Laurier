import { isMappedDoor } from "./campus-access.ts";
import type { CampusAccess } from "./campus-access.ts";
import { routeCampus } from "./routing.ts";
import { travelTime } from "./routing.ts";
import type { CampusPlace, Point, Route } from "./types.ts";

export const YOUR_LOCATION = "my-location";
export type DirectionsCampus = Parameters<typeof routeCampus>[0] & {
  places: (Pick<CampusPlace, "id" | "name" | "center" | "locationBuildingId"> & { polygon?: Point[] })[];
  entrances: Record<string, CampusAccess[]>;
};

// Resolve either endpoint in the same way, including a supplied outdoor fix.
// Building routes compare supported entrances using the existing timed graph.
export function routeCampusPlaces(
  data: DirectionsCampus,
  from: string,
  to: string,
  location: Point | null,
  avoidStairs: boolean,
  options: { accessOrigins?: Record<string, Point>; preferDistance?: boolean; requireEntrancesFor?: string[] } = {},
): Route | null {
  if (!from || !to || from === to) return null;
  type Access = Partial<CampusAccess> & { point: Point };
  const endpoints = (id: string): Access[] => {
    if (id === YOUR_LOCATION) return location ? [{ point: location }] : [];
    const place = data.places.find(p => p.id === id);
    if (!place) return [];
    const building = place.locationBuildingId ? data.places.find(p => p.id === place.locationBuildingId) : place;
    if (!building) return [];
    const doors = data.entrances[building.id]?.filter(d => d.routing !== false);
    // A path touching a footprint is an approach, not proof of a door.
    // Prefer explicitly tagged entrances whenever the snapshot provides them.
    const tagged = doors?.filter(isMappedDoor);
    if (options.requireEntrancesFor?.includes(id)) return tagged ?? [];
    return tagged?.length ? tagged : doors?.length ? doors : [{ point: building.center }];
  };
  let fastest: Route | null = null;
  let bestSeconds = Infinity;
  let departure: Access | undefined, arrival: Access | undefined;
  const approach = (id: string, point: Point) => {
    const origin = options.accessOrigins?.[id];
    return origin ? Math.hypot(origin[0] - point[0], origin[1] - point[1]) * 4 / travelTime.walkingMetresPerSecond : 0;
  };
  for (const start of endpoints(from)) {
    for (const end of endpoints(to)) {
      const anchor = (d: Access) => d.nodeId && data.walkNodes[d.nodeId] ? d.nodeId : undefined;
      const candidate = routeCampus(data, start.point, end.point, avoidStairs, { fromNodeId: anchor(start), toNodeId: anchor(end) });
      if (!candidate) continue;
      // Include the approach to an intermediate indoor connection when choosing
      // its entrance, rather than choosing a short outdoor leg with a long approach.
      const seconds = (candidate.estimatedSeconds ?? Infinity)
        + approach(from, candidate.nodes[0].point) + approach(to, candidate.nodes.at(-1)!.point);
      const distanceDifference = (candidate.distanceMeters ?? Infinity) - (fastest?.distanceMeters ?? Infinity);
      const better = !fastest || (options.preferDistance && Math.abs(distanceDifference) > .001
        ? distanceDifference < 0 : seconds < bestSeconds);
      if (better) {
        fastest = { ...candidate, departureAccess: start.point, arrivalAccess: end.point };
        departure = start; arrival = end;
        bestSeconds = seconds;
      }
    }
  }
  if (!fastest) return null;
  const chosen = fastest;
  const label = (id: string, access: Access | undefined) => {
    if (id === YOUR_LOCATION) return "Your location · nearby mapped path";
    const place = data.places.find(p => p.id === id)!;
    if (!access || !isMappedDoor({...access, main:access.main ?? false})) return `${place.name} · mapped access path`;
    const angle = Math.atan2(access.point[0] - place.center[0], place.center[1] - access.point[1]);
    const side = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    return `${place.name} · ${access.label ?? `${access.main ? "main " : ""}mapped entrance${place.polygon?.length ? ` · ${side} side` : ""}`}`;
  };
  return {
    ...chosen,
    nodes: chosen.nodes.map((node, i) => ({
      ...node,
      label: i === 0 ? label(from, departure) : i === chosen.nodes.length - 1 ? label(to, arrival) : node.label,
    })),
  };
}
