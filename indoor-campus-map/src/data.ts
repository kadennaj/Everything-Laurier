import userCampusEntrances from "./data/user-campus-entrances.json";
import { mergeCampusAccess } from "./campus-access";
import type { UserEntrance, CampusAccess } from "./campus-access";
import exitAnnotations from "./data/exit-annotations.json";
import { addIndoorExits } from "./indoor-exits";
import type { ExitAnnotation, ExitRoomUpdate } from "./indoor-exits";
import { indoorAccessLabel } from "./map-access";
import rawIndoor from "./data/indoors.json";
import rawCampus from "./data/campus.json";
import newIndoor from "./data/new-indoors.json";
import rawConnections from "./data/indoor-connections.json";
import { foodLocations } from "./food-locations";
import type { CampusData, IndoorBuilding, IndoorConnection, Point, RoomKind } from "./types";
export const indoors = addIndoorExits([...rawIndoor, ...newIndoor] as unknown as IndoorBuilding[], exitAnnotations.placed as ExitAnnotation[], exitAnnotations.updates as ExitRoomUpdate[]).map(b => ({
  ...b, floors: b.floors.map(f => ({ ...f, rooms: f.rooms.map(r => ({ ...r, name: indoorAccessLabel({...r, name: (exitAnnotations.renames as Record<string,string>)[r.id] ?? r.name}, rawConnections as IndoorConnection[]) })) })),
}));
export const indoorConnections = rawConnections as IndoorConnection[];
export function connectedBuildings(building: IndoorBuilding) {
  const ids = new Set([building.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of indoorConnections) {
      if (link.status !== "source-shown") continue;
      if (ids.has(link.fromBuilding) || ids.has(link.toBuilding)) {
        for (const id of [link.fromBuilding, link.toBuilding]) if (!ids.has(id)) { ids.add(id); changed = true; }
      }
    }
  }
  return indoors.filter(b => ids.has(b.id));
}
export function indoorForPlace(id: string) {
  return indoors.find(b => b.id === id || b.campusIds?.includes(id));
}
export const campus = { ...rawCampus, entrances: mergeCampusAccess(rawCampus.entrances as unknown as Record<string, CampusAccess[]>, userCampusEntrances.reports as unknown as UserEntrance[]), places: rawCampus.places.map(p => {
  const indoor = indoorForPlace(p.id);
  const food = foodLocations[p.id];
  if (food) return { ...p, ...food, description: food.locationNote };
  if (p.id === "DH" || p.id === "JAC") return { ...p, description: "Connected indoors with Concourse, Dining Hall and Music through the Solarium passage. Detailed indoor floor plans for Dining Hall and Music are not available yet." };
  return indoor ? { ...p, indoor: true, indoorId: indoor.id, description: indoor.coverage ?? p.description } : p;
}) } as unknown as CampusData & {
  entrances: Record<string, CampusAccess[]>;
  field: Point[];
  walkNodes: Record<string, Point>;
  walkEdges: {
    fromId: string;
    toId: string;
    stairs: boolean;
    road: boolean;
    crossing: boolean;
    pedestrianAllowed?: boolean;
  }[];
};
export const colors: Record<RoomKind, string> = {
  classroom: "#d2c4ee",
  lecture: "#b9a0df",
  office: "#e2dce9",
  study: "#c5dfd3",
  washroom: "#b9d7e3",
  stairs: "#f2d299",
  elevator: "#a9cddd",
  entrance: "#bdddc8",
  food: "#eed7b8",
  hallway: "#f3eee4",
};
export const kindNames: Record<RoomKind, string> = {
  classroom: "Classroom",
  lecture: "Lecture theatre",
  office: "Office",
  study: "Study & lounge",
  washroom: "Washrooms",
  stairs: "Stairs",
  elevator: "Elevator",
  entrance: "Entrance",
  food: "Restaurant & café",
  hallway: "Hallway",
};
export function geoToPoint(lat: number, lon: number): Point {
  return [
    ((lon - campus.origin.lon) *
      111320 *
      Math.cos((campus.origin.lat * Math.PI) / 180)) /
      4,
    ((campus.origin.lat - lat) * 111320) / 4,
  ];
}
export function pointToGeo([x, z]: Point) {
  return {
    lat: campus.origin.lat - (z * 4) / 111320,
    lon:
      campus.origin.lon +
      (x * 4) / (111320 * Math.cos((campus.origin.lat * Math.PI) / 180)),
  };
}
