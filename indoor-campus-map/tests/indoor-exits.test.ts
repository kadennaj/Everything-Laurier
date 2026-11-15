import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { addIndoorExits } from "../src/indoor-exits.ts";
import type { ExitAnnotation, ExitRoomUpdate } from "../src/indoor-exits.ts";
import type { IndoorBuilding } from "../src/types.ts";
import { buildIndoorGraph, projectToSegment, routeIndoors } from "../src/routing.ts";
import { defaultIndoorEntrance, indoorAccessKind } from "../src/map-access.ts";
const read = (file: string) => JSON.parse(readFileSync(new URL(`../src/data/${file}.json`, import.meta.url), "utf8"));
const annotations = read("exit-annotations");
const buildings = addIndoorExits([...read("indoors"), ...read("new-indoors")] as IndoorBuilding[], annotations.placed as ExitAnnotation[], annotations.updates as ExitRoomUpdate[]);
test("Lazaridis Floor 1 has four explicitly classified exterior doors with connected routes", () => {
  const laz = buildings.find(b => b.id === "LH")!;
  const exits = laz.floors[0].rooms.filter(r => indoorAccessKind(r, []) === "Exterior entrance");
  assert.equal(exits.length, 4);
  for (const exit of exits) assert.ok(routeIndoors(laz, "LH-entrance", exit.id, false));
});
test("P120 north stairwell exit is labelled but never pretends its level or approach is verified", () => {
  const peters = buildings.find(b => b.id === "P")!;
  const exit = peters.floors[0].rooms.find(r => r.id === "P1-exit-p120")!;
  assert.match(exit.name, /P120/);
  assert.match(indoorAccessKind(exit, [])!, /Exterior exit · route unverified/);
  assert.equal(buildIndoorGraph(peters).nodes.has(`room:${exit.id}`), false);
});
test("Every placed exit has a source asset, evidence and an endpoint on its marker boundary", () => {
  for (const entry of annotations.placed as ExitAnnotation[]) {
    assert.ok(entry.evidence.length > 20);
    assert.ok(existsSync(new URL(`../public${entry.source}`, import.meta.url)));
    const room = entry.room;
    assert.ok(Math.min(...room.polygon.map((p,i) => projectToSegment(room.door,p,room.polygon[(i+1)%room.polygon.length]).distance)) < .01);
  }

});

test("User-confirmed exterior doors at Service Laurier and both sides of the Arts hallway stay separate from indoor passages", () => {
  for (const [buildingId, exitIds] of [["P", ["P1-exit-service"]], ["ARTS", ["ARTS2-exit-peters-north", "ARTS2-exit-peters-south"]]] as const) {
    const building = buildings.find(b => b.id === buildingId)!;
    for (const id of exitIds) {
      const room = building.floors.flatMap(f => f.rooms).find(r => r.id === id)!;
      assert.equal(indoorAccessKind(room, []), "Exterior entrance");
      const start = buildingId === "P" ? "P1-entrance" : "ARTS2-peters-link";
      assert.ok(routeIndoors(building, start, id, false));
    }
  }
});

test("Both opposing junction doors are exterior entrances on Floor 1 and do not replace the indoor passage", () => {
  for (const pair of annotations.pairs) {
    for (const [buildingId, roomId] of [[pair.fromBuilding,pair.fromRoom], [pair.toBuilding,pair.toRoom]]) {
      const building = buildings.find(b => b.id === buildingId)!;
      const floor = building.floors.find(f => f.rooms.some(r => r.id === roomId))!;
      const room = floor.rooms.find(r => r.id === roomId)!;
      assert.equal(floor.level, 1);
      assert.equal(indoorAccessKind(room, []), "Exterior entrance");
      assert.ok(room.details?.includes("User"));
    }
  }
  assert.equal(defaultIndoorEntrance(buildings.find(b => b.id === "SC")!), "SC1-entrance");
  const schlegel = buildings.find(b => b.id === "SC")!;
  for (const floor of schlegel.floors.filter(f => f.level > 1)) {
    assert.notEqual(indoorAccessKind(floor.rooms.find(r => r.id === `SC${floor.level}-entrance`)!, []), "Exterior entrance");
  }
});
