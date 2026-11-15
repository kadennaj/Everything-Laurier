import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildingExits } from "../src/exit-directory.ts";
import { addIndoorExits } from "../src/indoor-exits.ts";
import { buildIndoorGraph } from "../src/routing.ts";
import type { IndoorBuilding, IndoorConnection } from "../src/types.ts";
import type { ExitAnnotation, ExitRoomUpdate } from "../src/indoor-exits.ts";
const read = (file: string) => JSON.parse(readFileSync(new URL(`../src/data/${file}.json`, import.meta.url), "utf8"));
const buildings = addIndoorExits([...read("indoors"), ...read("new-indoors")] as IndoorBuilding[], read("exit-annotations").placed as ExitAnnotation[], read("exit-annotations").updates as ExitRoomUpdate[]);
const connections = read("indoor-connections") as IndoorConnection[];

test("Every indoor building has an explicit exit inventory, without inventing upper-floor exterior doors", () => {
  const counts: Record<string,number> = {BA:1,LH:4,LIB:8,SCI:2,ARTS:3,P:3,SC:1,DAWB:1};
  assert.equal(buildings.length, 8);
  for (const building of buildings) {
    const entries = buildingExits(building, connections);
    assert.equal(entries.length, counts[building.id], building.id);
    const graph = buildIndoorGraph(building);
    for (const entry of entries) {
      assert.ok(building.floors.find(f => f.level === entry.floor)?.rooms.some(r => r.id === entry.room.id));
      assert.equal(entry.buildingId, building.id);
      assert.ok(!connections.some(c => c.fromRoom === entry.room.id || c.toRoom === entry.room.id));
      assert.equal(graph.nodes.has(`room:${entry.room.id}`), entry.status === "mapped");
    }
  }
});
test("Library directory finds the Floor 2 main entrance from any displayed floor and keeps west references unverified", () => {
  const entries = buildingExits(buildings.find(b => b.id === "LIB")!, connections);
  assert.equal(entries[0].room.id, "LIB2-entrance");
  assert.equal(entries[0].label, "EXIT · Main entrance");
  assert.equal(entries[0].floor, 2);
  assert.equal(entries[0].status, "mapped");
  assert.ok(entries.slice(1).every(e => e.status === "unverified" && /connection unverified/.test(e.description)));
});
test("Schlegel's user-confirmed exterior door is separate from its supported Peters passage", () => {
  const schlegel = buildings.find(b => b.id === "SC")!;
  const exits = buildingExits(schlegel, connections);
  assert.equal(exits.length, 1);
  assert.equal(exits[0].room.id, "SC1-entrance");
  assert.equal(exits[0].floor, 1);
  assert.equal(exits[0].status, "mapped");
  assert.ok(!connections.some(c => c.fromRoom === exits[0].room.id || c.toRoom === exits[0].room.id));
  assert.ok(connections.some(c => c.status === "source-shown" && [c.fromBuilding,c.toBuilding].includes("SC") && [c.fromBuilding,c.toBuilding].includes("P")));
});
