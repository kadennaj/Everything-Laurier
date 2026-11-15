import type { IndoorBuilding, IndoorConnection, Room } from "./types.ts";

// Exterior vestibules identified in the supplied plans. Connecting passages,
// upper-floor landings and unverified exits must never become the default door.
const exteriorDoors: Record<string, string[]> = {
  BA: ["BA-entrance"], LH: ["LH-entrance", "LH-north-entrance"],
  LIB: ["LIB2-entrance"], SCI: ["SCI1-entrance-a", "SCI1-entrance-b"],
  ARTS: ["ARTS1-entrance"], P: ["P1-entrance"], DAWB: ["DAWB1-entrance"],
};
export function defaultIndoorEntrance(building: IndoorBuilding | null) {
  if (!building) return "";
  return exteriorDoors[building.id]?.find(id => building.floors.some(f => f.rooms.some(r => r.id === id && r.routeable !== false)))
    ?? building.floors.flatMap(f => f.rooms).find(r => r.access === "exterior" && r.routeable !== false)?.id ?? "";
}
export function indoorAccessLabel(room: Room, connections: IndoorConnection[]) {
  if (room.kind !== "entrance") return room.name;
  if (room.access === "exterior" || room.routeable === false) return room.name;
  if (connections.some(c => c.status === "source-shown" && (c.fromRoom === room.id || c.toRoom === room.id)))
    return `${room.name} · indoor passage`;
  if (Object.values(exteriorDoors).some(ids => ids.includes(room.id))) return room.name;
  // The Schlegel photographs mark landings on several floors; they do not
  // establish exterior doors at each of those levels.
  return room.name.replace("Schlegel entrance / landing", "Schlegel stair landing");
}

export function indoorAccessKind(room: Room, connections: IndoorConnection[]) {
  if (room.kind !== "entrance") return null;
  if (room.access === "exterior") return room.routeable === false ? "Exterior exit · route unverified" : "Exterior entrance";
  if (room.routeable === false) return "Access landmark · unverified";
  if (connections.some(c => c.status === "source-shown" && (c.fromRoom === room.id || c.toRoom === room.id))) return "Indoor passage";
  if (Object.values(exteriorDoors).some(ids => ids.includes(room.id))) return "Exterior entrance";
  return "Stair landing";
}

export function indoorExitTitle(room: Room) {
  const titles: Record<string,string> = {
    "LIB2-entrance":"Main entrance",
    "LH-entrance":"Main lobby", "LH-north-entrance":"Parking lot", "LH-exit-1011":"Rear stairs", "LH-exit-byte75":"Byte 75",
    "P1-entrance":"South lobby", "P1-exit-service":"Peters junction", "SC1-entrance":"Schlegel junction", "P1-exit-p120":"P120 stairs",
    "ARTS2-exit-peters-north":"Hallway north", "ARTS2-exit-peters-south":"Hallway south",
    "SCI1-entrance-a":"Upper atrium", "SCI1-entrance-b":"Lower atrium",
  };
  return `EXIT · ${titles[room.id] ?? room.name}`;
}
