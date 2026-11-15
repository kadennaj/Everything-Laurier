import assert from "node:assert/strict";
import { test } from "node:test";
import { clampMapPan, mapBounds, nearFloor } from "../src/map-bounds.ts";
import type { Point } from "../src/types.ts";

test("Camera stops at every edge while preserving its distance and angle to the map", () => {
  const bounds = mapBounds([[-20, -4], [30, 15]], 6);
  for (const [x, z, expectedX, expectedZ] of [[200, -100, 36, -10], [-200, 100, -26, 21], [12, -3, 12, -3]]) {
    const target = { x, y: 4, z };
    const position = { x: x + 10, y: 100, z: z + 60 };
    clampMapPan(bounds, position, target);
    assert.deepEqual(target, { x: expectedX, y: 4, z: expectedZ });
    assert.deepEqual(position, { x: expectedX + 10, y: 100, z: expectedZ + 60 });
  }
});

test("A campus route can extend the pan area without removing any campus coverage", () => {
  const campus = mapBounds([[-40, -20], [25, 60]], 12);
  assert.deepEqual(mapBounds([], 12, campus), campus);
  assert.deepEqual(mapBounds([[100, 12]], 12, campus), {
    minX: -52, maxX: 112, minZ: -32, maxZ: 72,
  });
});

test("Zoomed-in indoor panning keeps the plan in view even outside a corner", () => {
  const floor: Point[] = [[0, 0], [12, 0], [0, 12]];
  assert.deepEqual(nearFloor([2, 3], [floor], 2), [2, 3]);
  assert.deepEqual(nearFloor([-1, 6], [floor], 2), [-1, 6]);
  assert.deepEqual(nearFloor([-8, 6], [floor], 2), [-2, 6]);
  const [x, z] = nearFloor([12, 12], [floor], 2);
  assert.ok(Math.hypot(x - 6, z - 6) <= 2.001);
});
