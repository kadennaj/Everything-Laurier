import { routeCampus } from "./routing.ts";
import { travelTime } from "./routing.ts";
import type { CampusPlace, Point, Route } from "./types.ts";

export const YOUR_LOCATION = "my-location";
export type DirectionsCampus = Parameters<typeof routeCampus>[0] & {
  places: Pick<CampusPlace, "id" | "name" | "center" | "locationBuildingId">[];
  entrances: Record<string, { point: Point; main: boolean }[]>;
};

// Resolve either endpoint in the same way, including a supplied outdoor fix.
// Building routes compare supported entrances using the existing timed graph.
export function routeCampusPlaces(
  data: DirectionsCampus,
  from: string,
  to: string,
  location: Point | null,
  avoidStairs: boolean,
  options: { accessOrigins?: Record<string, Point>; preferDistance?: boolean } = {},
): Route | null {
  if (!from || !to || from === to) return null;
  const endpoints = (id: string): Point[] => {
    if (id === YOUR_LOCATION) return location ? [location] : [];
    const place = data.places.find(p => p.id === id);
    if (!place) return [];
    const building = place.locationBuildingId ? data.places.find(p => p.id === place.locationBuildingId) : place;
    if (!building) return [];
    const doors = data.entrances[building.id];
    return doors?.map(d => d.point) ?? [building.center];
  };
  let fastest: Route | null = null;
  let bestSeconds = Infinity;
  const approach = (id: string, point: Point) => {
    const origin = options.accessOrigins?.[id];
    return origin ? Math.hypot(origin[0] - point[0], origin[1] - point[1]) * 4 / travelTime.walkingMetresPerSecond : 0;
  };
  for (const start of endpoints(from)) {
    for (const end of endpoints(to)) {
      const candidate = routeCampus(data, start, end, avoidStairs);
      if (!candidate) continue;
      // Include the approach to an intermediate indoor connection when choosing
      // its entrance, rather than choosing a short outdoor leg with a long approach.
      const seconds = (candidate.estimatedSeconds ?? Infinity)
        + approach(from, candidate.nodes[0].point) + approach(to, candidate.nodes.at(-1)!.point);
      const distanceDifference = (candidate.distanceMeters ?? Infinity) - (fastest?.distanceMeters ?? Infinity);
      const better = !fastest || (options.preferDistance && Math.abs(distanceDifference) > .001
        ? distanceDifference < 0 : seconds < bestSeconds);
      if (better) {
        fastest = { ...candidate, departureAccess: start, arrivalAccess: end };
        bestSeconds = seconds;
      }
    }
  }
  if (!fastest) return null;
  const chosen = fastest;
  const label = (id: string) => id === YOUR_LOCATION
    ? "Your location · nearby mapped path"
    : `${data.places.find(p => p.id === id)!.name} · mapped access path`;
  return {
    ...chosen,
    nodes: chosen.nodes.map((node, i) => ({
      ...node,
      label: i === 0 ? label(from) : i === chosen.nodes.length - 1 ? label(to) : node.label,
    })),
  };
}
