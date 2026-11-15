import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchingPlaces } from "../src/place-search.ts";
const campus = JSON.parse(readFileSync(new URL("../src/data/campus.json", import.meta.url), "utf8"));
const options = campus.places.map((p: {id:string;name:string;category:string}) => ({id:p.id,label:p.name,detail:p.category}));
test("Typing br suggests Bricker buildings and preserves every matching mapped option", () => {
  const matches = matchingPlaces(options, "br");
  assert.ok(matches.some(p => p.id === "BA"));
  assert.ok(matches.some(p => p.id === "RES-113045568"));
  assert.equal(new Set(matches.map(p => p.id)).size, matches.length);
  assert.ok(matches.every(p => options.some((option: {id:string}) => option.id === p.id)));
  assert.equal(matches[0].id, "BA");
});
test("Building search accepts partial names, aliases, case and multiple words", () => {
  assert.equal(matchingPlaces(options, " BRICKER ACAD ")[0].id, "BA");
  assert.equal(matchingPlaces(options, "LH")[0].id, "LH");
  assert.ok(matchingPlaces(options, "Laurier Library").some(p => p.id === "LIB"));
  assert.deepEqual(matchingPlaces(options, "not-a-real-campus-place"), []);
});
test("Empty search lists all supported choices instead of inventing a destination", () => {
  assert.equal(matchingPlaces(options, "").length, options.length);
  assert.deepEqual(matchingPlaces([], "br"), []);
});
