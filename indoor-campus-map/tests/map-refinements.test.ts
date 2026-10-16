import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { foodLocations } from "../src/food-locations.ts";
import { buildIndoorGraph, shortestRoute } from "../src/routing.ts";
import { routeCampusJourney } from "../src/sheltered-routing.ts";
import type { IndoorBuilding } from "../src/types.ts";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const buildings = read("../src/data/indoors.json") as IndoorBuilding[];
const arts = read("../src/data/new-indoors.json") as IndoorBuilding[];
const laz = buildings.find(b => b.id === "LH")!;
const campus = read("../src/data/campus.json");
campus.places = campus.places.map((p: { id: string }) => ({ ...p, ...foodLocations[p.id] }));
const links = read("../src/data/campus-indoor-links.json");

test("Corrected Lazaridis destinations remain reachable through the indoor graph", () => {
  const graph = buildIndoorGraph(laz);
  const restaurant = laz.floors[0].rooms.find(r => r.name === "Byte 75")!;
  assert.equal(restaurant.kind, "food");
  const lectureRooms = laz.floors[1].rooms.filter(r => ["LH2066", "LH2068", "LH2070"].includes(r.id)).sort((a,b) => a.center[0]-b.center[0]);
  assert.deepEqual(lectureRooms.map(r => r.name), ["LH 2066", "LH 2068", "LH 2070"]);
  for (const room of [restaurant, ...lectureRooms]) {
    const route = shortestRoute(graph, "room:LH-entrance", `room:${room.id}`, false);
    assert.ok(route);
    assert.equal(route.nodes.at(-1)!.label, room.name);
  }
  const hallway = laz.floors[2].rooms.find(r => r.name === "West hallway")!;
  assert.equal(hallway.kind, "hallway");
  assert.equal(hallway.open, true);
  assert.ok(!laz.floors[2].rooms.some(r => /west study lounge/i.test(r.name)));
  assert.ok(!laz.floors[2].furniture?.some(f => f.point[0] < 0));
});

test("Food locators refer to supplied rooms and never invent a Tim Hortons counter", () => {
  for (const location of Object.values(foodLocations)) {
    const b = [...buildings, ...arts].find(b => b.id === location.locationBuildingId || b.campusIds?.includes(location.locationBuildingId));
    assert.ok(b);
    if (location.locationRoomId) assert.ok(b.floors.some(f => f.rooms.some(r => r.id === location.locationRoomId)));
  }
  assert.equal(foodLocations["FOOD-5037259930"].locationRoomId, undefined);
  for (const [id, location] of Object.entries(foodLocations)) {
    const foodRoute = routeCampusJourney(campus, links, "LIB", id, null, false)!;
    const buildingRoute = routeCampusJourney(campus, links, "LIB", location.locationBuildingId, null, false)!;
    assert.ok(foodRoute && buildingRoute);
    assert.equal(foodRoute.estimatedSeconds, buildingRoute.estimatedSeconds);
    assert.deepEqual(foodRoute.nodes.map(n => n.point), buildingRoute.nodes.map(n => n.point));
    assert.match(foodRoute.nodes.at(-1)!.label!, /building access/);
  }
});

test("Dining Hall links indoors through the Solarium while DAWB stays separate", () => {
  for (const other of ["ARTS-E", "JAC"]) {
    for (const [from,to] of [["DH",other], [other,"DH"]]) {
      const route = routeCampusJourney(campus, links, from, to, null, false, true)!;
      assert.ok(route);
      assert.equal(route.outdoorDistanceMeters, 0);
      assert.ok(route.edges.some(e => e.instruction?.includes("Solarium")));
    }
  }
  assert.ok(!links.links.some((l: {from:string;to:string}) => l.from === "DAWB" || l.to === "DAWB"));
});
