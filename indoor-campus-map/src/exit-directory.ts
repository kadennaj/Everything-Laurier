import type { IndoorBuilding, IndoorConnection, Room } from "./types.ts";
import { indoorAccessKind, indoorExitTitle } from "./map-access.ts";

export interface ExitEntry {
  buildingId: string;
  buildingName: string;
  floor: number;
  room: Room;
  label: string;
  status: "mapped" | "unverified";
  description: string;
}
export function buildingExits(building: IndoorBuilding, connections: IndoorConnection[]): ExitEntry[] {
  return building.floors.flatMap(floor => floor.rooms.flatMap(room => {
    const kind = indoorAccessKind(room, connections);
    const exterior = kind?.startsWith("Exterior");
    const reference = room.kind === "entrance" && room.routeable === false && /\bexit\b/i.test(room.name);
    if (!exterior && !reference) return [];
    return [{ buildingId: building.id, buildingName: building.name, floor: floor.level, room,
      label: exterior ? indoorExitTitle(room) : "EXIT REFERENCE · West side",
      status: room.routeable === false ? "unverified" as const : "mapped" as const,
      description: exterior ? room.routeable === false ? "Exterior door shown; route approach unverified" : "Mapped exterior door · current access unverified"
        : "Source-plan exit reference · exterior connection unverified",
    }];
  })).sort((a,b) => Number(a.status === "unverified") - Number(b.status === "unverified") || a.floor - b.floor || a.label.localeCompare(b.label));
}
