export type Point = [number, number];
export type RoomKind =
  | "classroom"
  | "lecture"
  | "office"
  | "washroom"
  | "stairs"
  | "elevator"
  | "entrance"
  | "food"
  | "hallway"
  | "study";
export interface Room {
  id: string;
  name: string;
  kind: RoomKind;
  polygon: Point[];
  center: Point;
  door: Point;
  connector?: string;
  routeable?: boolean;
  open?: boolean;
  holes?: Point[][];
  details?: string;
}
export interface Floor {
  level: number;
  label: string;
  outline: Point[];
  holes?: Point[][];
  rooms: Room[];
  corridors: Point[][];
  blueprint: string;
  sourcePhotos?: string[];
  coverage?: string;
  walls?: Point[][];
  furniture?: { kind: "shelf" | "table" | "desk" | "bench" | "counter"; point: Point; width: number; depth: number; angle?: number }[];
}
export interface IndoorBuilding {
  id: string;
  name: string;
  floors: Floor[];
  source: string;
  defaultFloor?: number;
  northAngle?: number;
  campusIds?: string[];
  coverage?: string;
}
export interface CampusPlace {
  id: string;
  name: string;
  category: "Academic" | "Student life" | "Food" | "Athletics" | "Residence";
  polygon: Point[];
  holes?: Point[][];
  center: Point;
  height: number;
  indoor?: boolean;
  indoorId?: string;
  locationBuildingId?: string;
  locationRoomId?: string;
  locationNote?: string;
  description: string;
}
export interface CampusData {
  places: CampusPlace[];
  context: { polygon: Point[]; height: number }[];
  roads: { name: string; points: Point[]; width: number }[];
  paths: Point[][];
  trees: Point[];
  origin: { lat: number; lon: number };
}
export interface RouteNode {
  id: string;
  floor: number;
  point: Point;
  label?: string;
  kind?: RoomKind;
  buildingId?: string;
  placeId?: string;
}
export interface RouteEdge {
  from: string;
  to: string;
  cost: number;
  distanceMeters?: number;
  drawingDistance?: number;
  boardingSeconds?: number;
  kind: "walk" | "stairs" | "elevator" | "connection" | "indoor";
  instruction?: string;
}
export interface IndoorConnection {
  id: string;
  fromBuilding: string;
  fromRoom: string;
  toBuilding: string;
  toRoom: string;
  status: "source-shown" | "unconfirmed";
  source: string;
  note: string;
}
export interface Route {
  nodes: RouteNode[];
  edges: RouteEdge[];
  distance: number;
  distanceMeters?: number;
  estimatedSeconds?: number;
  outdoorDistanceMeters?: number;
  indoorOverview?: boolean;
  preference?: "fastest" | "indoors";
  departureAccess?: Point;
  arrivalAccess?: Point;
}
