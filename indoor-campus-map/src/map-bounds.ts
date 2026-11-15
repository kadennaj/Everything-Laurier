import type { Point } from "./types.ts";
import { projectToSegment } from "./routing.ts";

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function mapBounds(points: Iterable<Point>, padding: number, extent?: MapBounds): MapBounds {
  let { minX, maxX, minZ, maxZ } = extent ?? {
    minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity,
  };
  for (const [x, z] of points) {
    minX = Math.min(x - padding, minX);
    maxX = Math.max(x + padding, maxX);
    minZ = Math.min(z - padding, minZ);
    maxZ = Math.max(z + padding, maxZ);
  }
  return { minX, maxX, minZ, maxZ };
}

export function clampMapPan(bounds: MapBounds, position: { x: number; z: number }, target: { x: number; z: number }) {
  const x = Math.min(bounds.maxX, Math.max(bounds.minX, target.x));
  const z = Math.min(bounds.maxZ, Math.max(bounds.minZ, target.z));
  // Move both together so reaching the edge does not turn or tilt the map.
  position.x += x - target.x;
  position.z += z - target.z;
  target.x = x;
  target.z = z;
}

export function inside(p: Point, polygon: Point[]) {
  let contains = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) {
      contains = !contains;
    }
  }
  return contains;
}

export function nearFloor(point: Point, outlines: Point[][], padding: number): Point {
  if (outlines.some(outline => inside(point, outline))) return point;
  let closest: ReturnType<typeof projectToSegment> | undefined;
  for (const outline of outlines) {
    for (let i = 0; i < outline.length; i++) {
      const edge = projectToSegment(point, outline[i], outline[(i + 1) % outline.length]);
      if (edge.distance <= padding) return point;
      if (!closest || edge.distance < closest.distance) closest = edge;
    }
  }
  if (!closest) return point;
  const [x, z] = closest.point;
  const fraction = padding / closest.distance;
  return [x + (point[0] - x) * fraction, z + (point[1] - z) * fraction];
}
