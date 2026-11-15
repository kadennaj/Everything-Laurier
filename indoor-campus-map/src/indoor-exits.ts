import type { IndoorBuilding, Point, Room } from "./types.ts";
export interface ExitAnnotation { buildingId: string; floor: number; source: string; evidence: string; room: Room; corridor?: Point[] }
export interface ExitRoomUpdate { buildingId: string; floor: number; roomId: string; access: Room["access"]; name: string; details: string; source: string; evidence: string }
export function addIndoorExits(buildings: IndoorBuilding[], annotations: ExitAnnotation[], updates: ExitRoomUpdate[] = []): IndoorBuilding[] {
  return buildings.map(building => ({...building, floors: building.floors.map(floor => {
    const additions = annotations.filter(a => a.buildingId === building.id && a.floor === floor.level);
    const rooms = floor.rooms.map(room => {
      const update = updates.find(u => u.buildingId === building.id && u.floor === floor.level && u.roomId === room.id);
      return update ? {...room, access:update.access, name:update.name, details:update.details} : room;
    });
    return {...floor, rooms: [...rooms, ...additions.filter(a => !floor.rooms.some(r => r.id === a.room.id)).map(a => a.room)],
      corridors: [...floor.corridors, ...additions.flatMap(a => a.corridor ? [a.corridor] : [])]};
  })}));
}
