import type { Point, Route, RouteNode } from "./types.ts";

export interface DirectionStep {
  text: string;
  floor: number;
  kind: string;
  buildingId?: string;
  point: Point;
}
export function routeSteps(route: Route, buildingName: (id: string) => string = id => id): DirectionStep[] {
  if (!route.nodes.length) return [];
  const first = route.nodes[0], last = route.nodes.at(-1)!;
  const step = (node: RouteNode, text: string, kind: string): DirectionStep => ({ text, kind, floor: node.floor, buildingId: node.buildingId, point: node.point });
  const steps = [step(first, `Start at ${first.label ?? "the selected campus path"}`, "start")];
  let walkStart = 0, walkMetres = 0;
  let walkHeading: Point | null = null;
  let walkTurn = "";
  const flushWalk = () => {
    if (walkMetres >= 2) steps.push(step(route.nodes[walkStart], `${walkTurn ? `${walkTurn}, then follow` : "Follow"} the highlighted ${route.nodes[walkStart].buildingId ? "corridor" : "path"} for about ${Math.max(1, Math.round(walkMetres))} m.`, "walk"));
    walkMetres = 0;
    walkTurn = "";
  };
  for (let i = 0; i < route.edges.length; i++) {
    const edge = route.edges[i], start = route.nodes[i], end = route.nodes[i + 1];
    if (edge.kind === "walk" && !edge.instruction) {
      const heading: Point = [end.point[0] - start.point[0], end.point[1] - start.point[1]];
      if (!start.buildingId && (edge.distanceMeters ?? 0) >= 1) {
        if (walkHeading) {
          const cross = walkHeading[0] * heading[1] - walkHeading[1] * heading[0];
          const dot = walkHeading[0] * heading[0] + walkHeading[1] * heading[1];
          const angle = Math.atan2(cross, dot) * 180 / Math.PI;
          if (Math.abs(angle) >= 40) {
            flushWalk();
            walkTurn = Math.abs(angle) > 150 ? "Turn back" : `Turn ${angle > 0 ? "right" : "left"}`;
          }
        }
        walkHeading = heading;
      }
      if (!walkMetres) walkStart = i;
      walkMetres += edge.distanceMeters ?? 0;
      continue;
    }
    flushWalk();
    walkHeading = null;
    if (edge.instruction) steps.push(step(edge.kind === "transfer" ? end : start, edge.instruction, edge.kind));
    else if (edge.kind === "connection") steps.push(step(end, `Follow the indoor passage into ${buildingName(end.buildingId ?? "")} · Floor ${end.floor}.`, "connection"));
    else {
      while (route.edges[i + 1]?.kind === edge.kind && !route.edges[i + 1].instruction) i++;
      const destination = route.nodes[i + 1];
      steps.push(step(destination, start.buildingId
        ? `Take the ${edge.kind === "elevator" ? "elevator" : "stairs"} to Floor ${destination.floor}.`
        : "Use the outdoor steps along the highlighted path.", edge.kind));
    }
  }
  flushWalk();
  steps.push(step(last, `Arrive at ${last.label ?? "your destination"}.`, "arrival"));
  return steps;
}
