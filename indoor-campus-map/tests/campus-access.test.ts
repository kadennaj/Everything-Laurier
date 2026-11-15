import { readFileSync } from "node:fs";
import type { CampusAccess, UserEntrance } from "../src/campus-access.ts";
import { routeCampusPlaces } from "../src/campus-directions.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { accessLabel, accessSide, mergeCampusAccess } from "../src/campus-access.ts";

test("Door side labels follow the campus north/east coordinate system", () => {
  assert.equal(accessSide([0,0], [0,-1]), "north");
  assert.equal(accessSide([0,0], [1,0]), "east");
  assert.equal(accessSide([0,0], [0,1]), "south");
  assert.equal(accessSide([0,0], [-1,0]), "west");
  assert.equal(accessSide([0,0], [-1,-1]), "northwest");
});
test("Approach paths never claim to be exterior doors", () => {
  const place = {center:[0,0] as [number,number]};
  assert.match(accessLabel(place,{point:[1,0],main:false,source:"OSM pedestrian path on footprint boundary"}), /Approach path · door unverified · east side/);
  assert.match(accessLabel(place,{point:[0,1],main:true,source:"OSM entrance tag"}), /Main entrance · south side/);
  assert.match(accessLabel(place,{point:[0,-1],main:false,source:"OSM entrance tag"}), /Mapped entrance · north side/);
});

test("All eleven user-circled entrances are preserved; uncertain screenshot registrations stay out of routing", () => {
  const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));
  const campus = read("campus");
  const reports = read("user-campus-entrances").reports as UserEntrance[];
  const entrances = mergeCampusAccess(campus.entrances as Record<string,CampusAccess[]>, reports);
  assert.equal(reports.length, 11);
  for (const report of reports) {
    const merged = entrances[report.buildingId].find(d => d.label === report.label);
    assert.ok(merged);
    assert.equal(merged.confirmed, true);
    if (!report.nodeId) assert.equal(merged.routing, false);
    else assert.equal(entrances[report.buildingId].filter(d => d.nodeId === report.nodeId).length, 1);
  }
  const approximate = reports.find(d => d.routing === false)!;
  const fixture = {...campus, entrances:{...entrances, [approximate.buildingId]:[approximate]}};
  assert.equal(routeCampusPlaces(fixture, approximate.buildingId, "LIB", null, false, {requireEntrancesFor:[approximate.buildingId]}), null);
});
