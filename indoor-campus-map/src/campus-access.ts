import type { CampusPlace, Point } from "./types.ts";
export interface CampusAccess { point: Point; nodeId?: string; main: boolean; source?: string; label?: string; confirmed?: boolean; routing?: boolean }
export function accessSide(center: Point, point: Point) {
  const angle = Math.atan2(point[0] - center[0], center[1] - point[1]);
  return ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}
export function accessLabel(place: Pick<CampusPlace, "center">, access: CampusAccess) {
  if (access.label) return `${access.label}${access.routing === false ? " · approximate location" : ""}`;
  const kind = isMappedDoor(access) ? access.main ? "Main entrance" : "Mapped entrance" : "Approach path · door unverified";
  return `${kind} · ${accessSide(place.center, access.point)} side`;
}

export interface UserEntrance extends CampusAccess { buildingId: string; id: string; label: string; confirmed: boolean; routing: boolean; reassignFrom?: string }
export function mergeCampusAccess(original: Record<string, CampusAccess[]>, reports: UserEntrance[]) {
  const result = Object.fromEntries(Object.entries(original).map(([id, doors]) => [id, doors.map(d => ({...d}))]));
  for (const report of reports) {
    if (report.reassignFrom && report.nodeId) result[report.reassignFrom] = (result[report.reassignFrom] ?? []).filter(d => d.nodeId !== report.nodeId);
    const doors = result[report.buildingId] ??= [];
    const index = report.nodeId ? doors.findIndex(d => d.nodeId === report.nodeId) : -1;
    if (index >= 0) doors[index] = {...doors[index], ...report};
    else doors.push({...report});
  }
  return result;
}
export function isMappedDoor(access: CampusAccess) { return access.source === "OSM entrance tag" || access.confirmed === true; }
