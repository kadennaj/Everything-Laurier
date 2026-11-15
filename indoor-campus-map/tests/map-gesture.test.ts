import { test } from "node:test";
import assert from "node:assert/strict";
import { MapGesture } from "../src/map-gesture.ts";

test("A pinch never selects a building when the stationary finger is lifted last", () => {
  const gesture = new MapGesture();
  gesture.down(1, 20, 20); gesture.down(2, 80, 80);
  gesture.move(2, 150, 150);
  assert.equal(gesture.up(2, 150, 150), false);
  assert.equal(gesture.up(1, 20, 20), false);
  gesture.down(3, 20, 20);
  assert.equal(gesture.up(3, 21, 21), true, "the next independent tap still works");
});
test("Dragging back to the initial point still cannot select a building", () => {
  const gesture = new MapGesture();
  gesture.down(1, 20, 20); gesture.move(1, 80, 80); gesture.move(1, 20, 20);
  assert.equal(gesture.up(1, 20, 20), false);
});
test("Cancellation and stray pointer-up events cannot become taps", () => {
  const gesture = new MapGesture();
  gesture.down(1, 20, 20); gesture.cancel(1);
  assert.equal(gesture.up(1, 20, 20), false);
  assert.equal(gesture.up(2, 20, 20), false);
  gesture.down(3, 10, 10);
  assert.equal(gesture.up(3, 10, 10), true);
});
