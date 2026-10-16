import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routeCampusPlaces, YOUR_LOCATION } from "../src/campus-directions.ts";
import type { Point } from "../src/types.ts";

const campus = JSON.parse(readFileSync(new URL("../src/data/campus.json", import.meta.url), "utf8"));

test("Your location works as either endpoint with reversed route and matching time", () => {
  const fix: Point = campus.entrances.LIB.find((d: { main: boolean }) => d.main).point;
  const outbound = routeCampusPlaces(campus, YOUR_LOCATION, "AC", fix, false);
  const inbound = routeCampusPlaces(campus, "AC", YOUR_LOCATION, fix, false);
  assert.ok(outbound && inbound);
  assert.match(outbound.nodes[0].label!, /^Your location/);
  assert.match(inbound.nodes.at(-1)!.label!, /^Your location/);
  assert.deepEqual(outbound.nodes[0].point, fix);
  assert.deepEqual(inbound.nodes.at(-1)!.point, fix);
  assert.ok(Math.abs(outbound.estimatedSeconds! - inbound.estimatedSeconds!) < .01);
  assert.ok(outbound.distanceMeters! < 560, "Keep the direct Library–Athletics route");
});

test("Missing location never silently substitutes a building or arbitrary point", () => {
  assert.equal(routeCampusPlaces(campus, YOUR_LOCATION, "LIB", null, false), null);
  assert.equal(routeCampusPlaces(campus, "LIB", YOUR_LOCATION, null, false), null);
  assert.equal(routeCampusPlaces(campus, "missing-building", "LIB", [0, 0], false), null);
  assert.equal(routeCampusPlaces(campus, YOUR_LOCATION, YOUR_LOCATION, [0, 0], false), null);
});

test("Campus place routing compares main and other mapped entrances instead of forcing the main door", () => {
  const fixture = {
    places: [{ id: "A", name: "Building A", center: [0, 0] as Point }, { id: "B", name: "Building B", center: [10, 0] as Point }],
    entrances: {
      A: [{ point: [0, 0] as Point, main: true }, { point: [8, 0] as Point, main: false }],
      B: [{ point: [10, 0] as Point, main: true }],
    },
    walkNodes: { left: [0, 0] as Point, right: [10, 0] as Point },
    walkEdges: [{ fromId: "left", toId: "right", stairs: false, road: false }],
  };
  const route = routeCampusPlaces(fixture, "A", "B", null, false);
  assert.ok(route);
  assert.deepEqual(route.nodes[0].point, [8, 0]);
  assert.equal(route.distanceMeters, 8);
  assert.match(route.nodes.at(-1)!.label!, /Building B/);
});

test("Intermediate entrance selection includes its indoor approach time", () => {
  const fixture = {
    places: [{ id: "A", name: "A", center: [0, 0] as Point }, { id: "B", name: "B", center: [10, 0] as Point }],
    entrances: { A: [{ point: [0, 0] as Point, main: true }, { point: [8, 10] as Point, main: false }] },
    walkNodes: { a: [0, 0] as Point, b: [10, 0] as Point, c: [8, 10] as Point },
    walkEdges: [{ fromId: "a", toId: "b", stairs: true, road: false }, { fromId: "c", toId: "b", stairs: false, road: false }],
  };
  const doorstep = routeCampusPlaces(fixture, "A", "B", null, false)!;
  const transfer = routeCampusPlaces(fixture, "A", "B", null, false, { accessOrigins: { A: [0, 0] } })!;
  assert.deepEqual(doorstep.departureAccess, [8, 10]);
  assert.deepEqual(transfer.departureAccess, [0, 0]);
});

test("Location routes preserve the avoid-stairs preference", () => {
  const fixture = {
    places: [{ id: "B", name: "Building B", center: [10, 0] as Point }],
    entrances: {},
    walkNodes: { a: [0, 0] as Point, b: [10, 0] as Point, c: [5, 5] as Point },
    walkEdges: [
      { fromId: "a", toId: "b", stairs: true, road: false },
      { fromId: "a", toId: "c", stairs: false, road: false },
      { fromId: "c", toId: "b", stairs: false, road: false },
    ],
  };
  const route = routeCampusPlaces(fixture, YOUR_LOCATION, "B", [0, 0], true);
  assert.ok(route);
  assert.ok(route.edges.every(e => e.kind !== "stairs"));
});
