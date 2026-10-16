import registration from "./data/indoor-registration.json" with { type: "json" };
import type { Floor, IndoorBuilding, Point, RouteNode } from "./types.ts";

// Photo registration in approximate metres. Connected wings share one geographic
// frame and view bearing; source floors and routing nodes retain their original IDs.
const wings: Record<string, { floorOffset: number; name: string }> = {
  ARTS: { floorOffset: 0, name: "Arts Building" },
  P: { floorOffset: 1, name: "Peters Building" },
  SC: { floorOffset: 1, name: "Schlegel Building" },
  SCI: { floorOffset: 0, name: "Science Building" },
  BA: { floorOffset: 0, name: "Bricker Academic" },
};
type Registration = { matrix: number[][]; offset: number[] };
const transforms: Record<string, Record<string, Registration>> = registration.buildings;
const legacyScale: Record<string, number> = registration.legacyMetresPerUnit;
export const sharedNorthAngle = registration.viewBearingDegrees;
export const isSharedBuilding = (id?: string) => !!id && id in wings;
export const mapBuildingName = (id: string) => wings[id]?.name ?? id;
export const sharedLevel = (id: string, floor: number) => floor + (wings[id]?.floorOffset ?? 0);
const group = (id?: string) => id && (["ARTS","P","SC"].includes(id) ? "arts" : ["SCI","BA"].includes(id) ? "science" : id);
export const sameIndoorView = (a?: string, b?: string) => a === b || (!!a && !!b && group(a) === group(b));
export function displayPoint(id: string, point: Point, floor = 1): Point {
  const r = transforms[id]?.[floor];
  if (!r) return [...point];
  return [r.matrix[0][0]*point[0]+r.matrix[0][1]*point[1]+r.offset[0], r.matrix[1][0]*point[0]+r.matrix[1][1]*point[1]+r.offset[1]];
}
export function metresBetween(id: string, floor: number, a: Point, b: Point) {
  const p = displayPoint(id,a,floor), q = displayPoint(id,b,floor);
  // Older hand traces use a footprint-area scale estimate, rather than mixing
  // their arbitrary drawing dimensions with time costs for lifts and stairs.
  return Math.hypot(p[0]-q[0],p[1]-q[1]) * (transforms[id]?.[floor] ? 1 : legacyScale[id] ?? 1);
}
export function displayFloor(id: string, floor: Floor): Floor {
  const p = (point: Point) => displayPoint(id, point, floor.level);
  return {
    ...floor, level: sharedLevel(id, floor.level), outline: floor.outline.map(p),
    holes: floor.holes?.map(h => h.map(p)), walls: floor.walls?.map(w => w.map(p)),
    corridors: floor.corridors.map(c => c.map(p)),
    rooms: floor.rooms.map(r => ({ ...r, center: p(r.center), door: p(r.door), polygon: r.polygon.map(p), holes: r.holes?.map(h => h.map(p)) })),
    furniture: floor.furniture?.map(f => {
      const angle = f.angle ?? 0, origin = p(f.point);
      const x = p([f.point[0]+Math.cos(angle)*f.width,f.point[1]+Math.sin(angle)*f.width]);
      const z = p([f.point[0]-Math.sin(angle)*f.depth,f.point[1]+Math.cos(angle)*f.depth]);
      return { ...f, point: origin, width: Math.hypot(x[0]-origin[0],x[1]-origin[1]), depth: Math.hypot(z[0]-origin[0],z[1]-origin[1]), angle: Math.atan2(x[1]-origin[1],x[0]-origin[0]) };
    }),
  };
}
export function displayNode(node: RouteNode): RouteNode {
  return node.buildingId ? { ...node, point: displayPoint(node.buildingId, node.point, node.floor), floor: sharedLevel(node.buildingId, node.floor) } : node;
}
export function floorAtLevel(building: IndoorBuilding, level: number, nearest = false): Floor | undefined {
  return building.floors.find(f => sharedLevel(building.id, f.level) === level) ??
    (nearest ? [...building.floors].sort((a,b) => Math.abs(sharedLevel(building.id,a.level)-level) - Math.abs(sharedLevel(building.id,b.level)-level))[0] : undefined);
}
export function levelCaption(buildings: IndoorBuilding[], level: number) {
  return buildings.flatMap(b => {
    const floor = floorAtLevel(b, level);
    return floor ? [`${b.id === "ARTS" ? "Arts" : b.id === "P" ? "Peters" : b.id === "SC" ? "Schlegel" : b.id === "SCI" ? "Science" : b.id === "BA" ? "Bricker" : "DAWB"} ${floor.level}`] : [];
  }).join(" · ");
}
