import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routeCampusJourney, routeMostlyIndoors } from "../src/sheltered-routing.ts";
import { routeCampusPlaces, YOUR_LOCATION } from "../src/campus-directions.ts";
import type { Point } from "../src/types.ts";

const campus = JSON.parse(readFileSync(new URL("../src/data/campus.json", import.meta.url), "utf8"));
const network = JSON.parse(readFileSync(new URL("../src/data/campus-indoor-links.json", import.meta.url), "utf8"));

test("Schlegel to Athletics stays inside Peters, Arts, Concourse and Music, then uses the underpass exit", () => {
  const route = routeMostlyIndoors(campus, network, "SC", "AC", null, false);
  const outdoor = routeCampusPlaces(campus, "SC", "AC", null, false);
  assert.ok(route && outdoor);
  assert.deepEqual(route.nodes.filter(n => n.placeId).map(n => n.placeId), ["SC", "P", "ARTS-C", "ARTS-E", "JAC"]);
  assert.ok(route.edges.some(e => e.instruction?.includes("under the bridgeway")));
  assert.ok(route.outdoorDistanceMeters! < outdoor.distanceMeters!);
  assert.ok(route.distanceMeters! > route.outdoorDistanceMeters!);
  assert.equal(route.preference, "indoors");
  assert.equal(route.nodes.at(-1)!.label, "Athletics Complex · mapped access path");
  for (let i = 0; i < route.edges.length; i++) {
    assert.equal(route.edges[i].from, route.nodes[i].id);
    assert.equal(route.edges[i].to, route.nodes[i + 1].id);
  }
  assert.equal(new Set(route.nodes.map(n => n.id)).size, route.nodes.length);
  const exit = campus.entrances.JAC.find((d: { nodeId: string }) => d.nodeId === network.exits.JAC.nodeId);
  const exitStep = route.edges.findIndex(e => e.instruction?.startsWith("Exit the music"));
  assert.deepEqual(route.nodes[exitStep + 1].point, exit.point);
});

test("Reverse sheltered directions enter at the bridgeway and retain the same outdoor distance", () => {
  const forward = routeMostlyIndoors(campus, network, "SC", "AC", null, false)!;
  const reverse = routeMostlyIndoors(campus, network, "AC", "SC", null, false)!;
  assert.ok(reverse);
  assert.deepEqual(reverse.nodes.filter(n => n.placeId).map(n => n.placeId), ["JAC", "ARTS-E", "ARTS-C", "P", "SC"]);
  assert.ok(reverse.edges.some(e => e.instruction?.startsWith("Enter the music building under the bridgeway")));
  assert.ok(Math.abs(forward.outdoorDistanceMeters! - reverse.outdoorDistanceMeters!) < .001);
  assert.ok(Math.abs(forward.estimatedSeconds! - reverse.estimatedSeconds!) < .001);
});

test("Sheltered preference minimizes outdoor distance even when its total time is longer", () => {
  const fixture = {
    places: [{ id: "A", name: "A", center: [0, 0] as Point }, { id: "B", name: "B", center: [10, 0] as Point }, { id: "C", name: "C", center: [9, 0] as Point }],
    entrances: {}, walkNodes: { a: [0, 0] as Point, b: [10, 0] as Point },
    walkEdges: [{ fromId: "a", toId: "b", stairs: false, road: false }],
  };
  const links = { links: [{ from: "A", to: "C", status: "supported", artsLevelChange: true }], exits: {} };
  const sheltered = routeMostlyIndoors(fixture, links, "A", "B", null, false)!;
  const fastest = routeCampusPlaces(fixture, "A", "B", null, false)!;
  assert.equal(sheltered.outdoorDistanceMeters, 4);
  assert.ok(sheltered.estimatedSeconds! > fastest.estimatedSeconds!);
  const automatic = routeCampusJourney(fixture, links, "A", "B", null, false)!;
  assert.equal(automatic.preference, "fastest");
  assert.equal(automatic.indoorOverview, false);
  assert.equal(automatic.estimatedSeconds, fastest.estimatedSeconds);
  const unconfirmed = routeMostlyIndoors(fixture, { ...links, links: [{ ...links.links[0], status: "unconfirmed" }] }, "A", "B", null, false)!;
  assert.equal(unconfirmed.indoorOverview, false);
  assert.equal(unconfirmed.outdoorDistanceMeters, fastest.distanceMeters);
});

test("Default fastest route uses an indoor connection when it beats the outdoor detour", () => {
  const fixture = {
    places: [{ id: "A", name: "A", center: [0, 0] as Point }, { id: "B", name: "B", center: [10, 0] as Point }],
    entrances: {},
    walkNodes: { a: [0, 0] as Point, c: [0, 20] as Point, d: [10, 20] as Point, b: [10, 0] as Point },
    walkEdges: [{ fromId: "a", toId: "c", stairs: false, road: false }, { fromId: "c", toId: "d", stairs: false, road: false }, { fromId: "d", toId: "b", stairs: false, road: false }],
  };
  const links = { links: [{ from: "A", to: "B", status: "supported" }], exits: {} };
  const automatic = routeCampusJourney(fixture, links, "A", "B", null, false)!;
  const outdoor = routeCampusPlaces(fixture, "A", "B", null, false)!;
  assert.ok(automatic.estimatedSeconds! < outdoor.estimatedSeconds!);
  assert.equal(automatic.outdoorDistanceMeters, 0);
  assert.deepEqual(automatic.nodes.map(n => n.placeId), ["A", "B"]);
  const unconfirmed = routeCampusJourney(fixture, { ...links, links: [{ ...links.links[0], status: "unconfirmed" }] }, "A", "B", null, false)!;
  assert.equal(unconfirmed.estimatedSeconds, outdoor.estimatedSeconds);
});

test("Default campus search beats the sheltered Schlegel route, keeps Library direct, and reverses consistently", () => {
  const fast = routeCampusJourney(campus, network, "SC", "AC", null, false)!;
  const reverse = routeCampusJourney(campus, network, "AC", "SC", null, false)!;
  const sheltered = routeMostlyIndoors(campus, network, "SC", "AC", null, false)!;
  const outdoor = routeCampusPlaces(campus, "SC", "AC", null, false)!;
  assert.ok(fast.estimatedSeconds! < outdoor.estimatedSeconds!);
  assert.ok(fast.estimatedSeconds! < sheltered.estimatedSeconds!);
  assert.equal(fast.preference, "fastest");
  assert.ok(fast.edges.some(e => e.kind === "indoor"));
  assert.ok(fast.edges.some(e => e.kind === "walk"));
  assert.ok(!fast.edges.some(e => e.instruction?.includes("under the bridgeway")), "Do not label an unrelated exit as the Music underpass");
  assert.ok(Math.abs(fast.estimatedSeconds! - reverse.estimatedSeconds!) < .001);
  assert.deepEqual(fast.nodes.map(n => n.point), reverse.nodes.map(n => n.point).reverse());
  assert.ok(Math.abs(fast.estimatedSeconds! - fast.edges.reduce((s, e) => s + e.cost, 0)) < .001);
  const library = routeCampusJourney(campus, network, "LIB", "AC", null, false)!;
  assert.equal(library.indoorOverview, false);
  assert.equal(library.estimatedSeconds, routeCampusPlaces(campus, "LIB", "AC", null, false)!.estimatedSeconds);
});

test("Sheltered GPS endpoints retain the fix and missing fixes fail cleanly", () => {
  const fix: Point = campus.entrances.AC[0].point;
  const route = routeMostlyIndoors(campus, network, "SC", YOUR_LOCATION, fix, false)!;
  assert.ok(route);
  assert.deepEqual(route.nodes.at(-1)!.point, fix);
  assert.match(route.nodes.at(-1)!.label!, /^Your location/);
  assert.equal(routeMostlyIndoors(campus, network, "SC", YOUR_LOCATION, null, false), null);
});

test("Conrad has its real outer footprint, courtyard and usable outdoor route endpoints", () => {
  const conrad = campus.places.find((p: { id: string }) => p.id === "CONRAD");
  assert.ok(conrad);
  assert.equal(conrad.category, "Residence");
  assert.equal(conrad.polygon.length, 30);
  assert.equal(conrad.holes.length, 1);
  assert.deepEqual(conrad.polygon[0], conrad.polygon.at(-1));
  assert.ok(campus.entrances.CONRAD.length);
  assert.ok(routeCampusPlaces(campus, "CONRAD", "AC", null, false));
  assert.ok(routeCampusPlaces(campus, "LIB", "CONRAD", null, false));
  assert.ok(network.links.every((l: { from: string; to: string }) => ![l.from, l.to].includes("DAWB")));
});

test("Avoid-stairs sheltered routes exclude outdoor steps and use the Arts elevator estimate", () => {
  const route = routeMostlyIndoors(campus, network, "SC", "AC", null, true)!;
  assert.ok(route);
  assert.ok(route.edges.every(e => e.kind !== "stairs"));
  assert.ok(route.edges.some(e => e.instruction?.includes("Arts using the elevator")));
});
