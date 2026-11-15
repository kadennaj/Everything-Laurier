import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultIndoorEntrance, indoorAccessLabel } from "../src/map-access.ts";
import { routeCampusPlaces } from "../src/campus-directions.ts";
import { routeCampus } from "../src/routing.ts";
import { routeSteps } from "../src/route-steps.ts";
import type { IndoorBuilding, IndoorConnection, Point, Route } from "../src/types.ts";
const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));
const buildings: IndoorBuilding[] = [...read("indoors"), ...read("new-indoors")];
const connections: IndoorConnection[] = read("indoor-connections");

test("Default indoor start is an exterior vestibule, never a connecting passage or upper landing", () => {
  for (const [id, door] of [["P", "P1-entrance"], ["LIB", "LIB2-entrance"], ["BA", "BA-entrance"], ["ARTS", "ARTS1-entrance"], ["DAWB", "DAWB1-entrance"]]) {
    const building = buildings.find(b => b.id === id)!;
    assert.equal(defaultIndoorEntrance(building), door);
    assert.ok(!connections.some(c => c.fromRoom === door || c.toRoom === door));
  }
  assert.equal(defaultIndoorEntrance(buildings.find(b => b.id === "SC")!), "", "Schlegel's ambiguous landings require the user to choose a start");
  assert.equal(defaultIndoorEntrance(null), "");
});

test("Schlegel landings and supported indoor links are named distinctly from exterior doors", () => {
  const schlegel = buildings.find(b => b.id === "SC")!;
  for (const floor of schlegel.floors) {
    const landing = floor.rooms.find(r => r.id === `SC${floor.level}-entrance`)!;
    assert.match(indoorAccessLabel(landing, connections), /stair landing/);
    assert.doesNotMatch(indoorAccessLabel(landing, connections), /entrance/);
    const link = floor.rooms.find(r => r.id === `SC${floor.level}-peters-link`)!;
    assert.match(indoorAccessLabel(link, connections), /indoor passage/);
  }
});

const fixture = {
  places: [{ id: "A", name: "A", center: [0, 0] as Point }, { id: "B", name: "B", center: [10, 0] as Point }],
  entrances: { A: [
    { point: [0, 0] as Point, nodeId: "a", main: true, source: "OSM entrance tag" },
    { point: [9, 0] as Point, nodeId: "near", main: false, source: "OSM pedestrian path on footprint boundary" },
  ] },
  walkNodes: { a: [0, 0] as Point, near: [9, 0] as Point, b: [10, 0] as Point },
  walkEdges: [{ fromId: "a", toId: "near", stairs: false, road: false }, { fromId: "near", toId: "b", stairs: false, road: false }],
};
test("A path touching the footprint cannot replace a mapped door just to shorten the route", () => {
  const route = routeCampusPlaces(fixture, "A", "B", null, false)!;
  assert.deepEqual(route.departureAccess, [0, 0]);
  assert.equal(route.distanceMeters, 40);
  assert.match(route.nodes[0].label!, /main mapped entrance/);
  const reverse = routeCampusPlaces(fixture, "B", "A", null, false)!;
  assert.deepEqual(reverse.arrivalAccess, [0, 0]);
  assert.equal(route.distanceMeters, reverse.distanceMeters);
});
test("Indoor transfers require an actual mapped entrance, not a centre or boundary approach", () => {
  const data = { ...fixture, entrances: { A: [fixture.entrances.A[1]] } };
  assert.equal(routeCampusPlaces(data, "A", "B", null, false, { requireEntrancesFor: ["A"] }), null);
  assert.ok(routeCampusPlaces(data, "A", "B", null, false));
});
test("An anchored door cannot jump to a parallel disconnected path", () => {
  const data = { walkNodes: { a: [0, 0] as Point, b: [10, 0] as Point, c: [0, .1] as Point, d: [20, .1] as Point },
    walkEdges: [{ fromId: "a", toId: "b", stairs: false, road: false }, { fromId: "c", toId: "d", stairs: false, road: false }] };
  assert.equal(routeCampus(data, [0, 0], [20, .1], false, { fromNodeId: "a", toNodeId: "d" }), null);
  assert.ok(routeCampus(data, [0, 0], [10, 0], false, { fromNodeId: "a", toNodeId: "b" }));
});
test("Directions group corridor walks, preserve floor changes, and focus the corresponding point", () => {
  const route: Route = { distance: 20, nodes: [
    { id: "a", floor: 1, point: [0, 0], label: "South entrance", buildingId: "A" },
    { id: "b", floor: 1, point: [2, 0], buildingId: "A" },
    { id: "c", floor: 1, point: [4, 0], buildingId: "A", kind: "stairs" },
    { id: "d", floor: 2, point: [4, 0], buildingId: "A", kind: "stairs" },
    { id: "e", floor: 2, point: [4, 4], label: "Room 200", buildingId: "A" },
  ], edges: [
    { from: "a", to: "b", kind: "walk", cost: 4, distanceMeters: 5 },
    { from: "b", to: "c", kind: "walk", cost: 4, distanceMeters: 5 },
    { from: "c", to: "d", kind: "stairs", cost: 20, distanceMeters: 0 },
    { from: "d", to: "e", kind: "walk", cost: 4, distanceMeters: 5 },
  ] };
  const steps = routeSteps(route);
  assert.equal(steps.length, 5);
  assert.match(steps[1].text, /about 10 m/);
  assert.match(steps[2].text, /stairs to Floor 2/);
  assert.equal(steps[2].floor, 2);
  assert.match(steps.at(-1)!.text, /Arrive at Room 200/);
  assert.deepEqual(steps.at(-1)!.point, [4, 4]);
});

test("Outdoor turns reverse correctly and do not appear as a single long walk", () => {
  const route: Route = { distance: 20, nodes: [
    { id: "a", floor: 0, point: [0, 0] }, { id: "b", floor: 0, point: [10, 0] }, { id: "c", floor: 0, point: [10, 10] },
  ], edges: [
    { from: "a", to: "b", kind: "walk", cost: 30, distanceMeters: 40 },
    { from: "b", to: "c", kind: "walk", cost: 30, distanceMeters: 40 },
  ] };
  const forward = routeSteps(route);
  assert.ok(forward.some(s => /Turn right/.test(s.text)));
  assert.equal(forward.filter(s => s.kind === "walk").length, 2);
  const backward = routeSteps({ ...route, nodes: [...route.nodes].reverse(), edges: [...route.edges].reverse().map(e => ({ ...e, from: e.to, to: e.from })) });
  assert.ok(backward.some(s => /Turn left/.test(s.text)));
});
