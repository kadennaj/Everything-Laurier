import { test } from "node:test";
import assert from "node:assert/strict";
import { compassHeading, headingDifference, LiveLocationController, sensorIsFresh } from "../src/live-location.ts";
import type { LocationEnvironment, OrientationReading } from "../src/live-location.ts";

function sensors(permission: "granted" | "denied" | "unavailable" = "granted") {
  let position!: PositionCallback, error!: PositionErrorCallback;
  let orientation: ((event: OrientationReading) => void) | null = null;
  let now = 100000;
  const calls = { watches: 0, cleared: [] as number[], listens: 0, removed: 0 };
  const environment: LocationEnvironment = {
    geolocation: {
      watchPosition: (success, failure) => { calls.watches++; position = success; error = failure!; return 7; },
      clearWatch: id => { calls.cleared.push(id); },
    },
    now: () => now,
    screenAngle: () => 0,
    requestCompass: async () => permission,
    listen: callback => { calls.listens++; orientation = callback; return () => { calls.removed++; orientation = null; }; },
  };
  const live = new LiveLocationController(environment, () => {});
  const move = (latitude = 43.475, timestamp = now, accuracy = 6) => position({ coords: { latitude, longitude: -80.529, accuracy, altitude: null, altitudeAccuracy: null, heading: 90, speed: 1, toJSON: () => ({}) }, timestamp, toJSON: () => ({}) });
  return { live, environment, calls, move, fail: (code: number) => error({ code, message: "test error", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }), face: (degrees: number) => orientation?.({ alpha: null, beta: null, absolute: false, webkitCompassHeading: degrees, webkitCompassAccuracy: 8 }), advance: (ms: number) => { now += ms; } };
}

test("Live tracking shares one GPS watch across center/follow/heading and receives moving fixes", async () => {
  const s = sensors();
  s.live.start("center");
  await Promise.resolve();
  s.move();
  assert.equal(s.live.state.mode, "center");
  assert.equal(s.live.state.loading, false);
  s.live.start("follow");
  s.advance(1000); s.move(43.476);
  assert.equal(s.live.state.fix?.latitude, 43.476);
  s.live.start("heading"); s.face(270);
  assert.equal(s.live.state.compass?.degrees, 270);
  assert.equal(s.calls.watches, 1);
  assert.equal(s.calls.listens, 1);
  assert.equal(s.live.state.centerRequest, 3);
  s.live.browse();
  assert.equal(s.live.state.mode, "free");
  assert.equal(s.live.state.active, true, "Panning stops camera follow, not the GPS feed");
});

test("Stopping tracking removes sensors and ignores late fixes", async () => {
  const s = sensors(); s.live.start(); await Promise.resolve(); s.move();
  s.live.stop(); s.advance(1000); s.move(43.477); s.face(20);
  assert.deepEqual(s.calls.cleared, [7]);
  assert.equal(s.calls.removed, 1);
  assert.equal(s.live.state.fix, null);
  assert.equal(s.live.state.compass, null);
  assert.equal(s.live.state.active, false);
});

test("A delayed compass permission cannot restart sensors after tracking stops", async () => {
  const s = sensors();
  let resolve!: (value: "granted") => void;
  s.environment.requestCompass = () => new Promise(done => { resolve = done; });
  s.live.start(); s.live.stop(); resolve("granted");
  await Promise.resolve();
  assert.equal(s.calls.listens, 0);
  assert.equal(s.live.state.active, false);
});

test("Unavailable or denied compass still permits GPS; travel course never becomes facing direction", async () => {
  for (const permission of ["denied", "unavailable"] as const) {
    const s = sensors(permission); s.live.start("heading"); await Promise.resolve(); s.move();
    assert.ok(s.live.state.fix);
    assert.equal(s.live.state.compass, null);
    assert.match(s.live.state.compassMessage, /GPS follow still works/);
    assert.equal(s.calls.listens, 0);
  }
});

test("Location denial closes tracking while a temporary signal error can recover", async () => {
  const s = sensors(); s.live.start(); await Promise.resolve();
  s.fail(2); assert.equal(s.live.state.active, true); s.move(); assert.equal(s.live.state.message, "");
  s.fail(1); assert.equal(s.live.state.active, false); assert.equal(s.live.state.fix, null);
  assert.match(s.live.state.message, /permission was denied/);
  assert.deepEqual(s.calls.cleared, [7]);
});

test("GPS rejects old, malformed and out-of-order sensor fixes", () => {
  const s = sensors(); s.live.start(); s.move();
  s.advance(1000); s.move(43.48, 99000); s.move(NaN); s.move(91); s.move(43.48, 101000, -1);
  assert.equal(s.live.state.fix?.latitude, 43.475);
  assert.equal(sensorIsFresh(100000, 130001, 30000), false);
  assert.equal(sensorIsFresh(100000, 105001, 5000), false);
  assert.equal(sensorIsFresh(NaN, 100000, 5000), false);
});

test("Physical compass readings handle screen rotation and north wrap without accepting relative rotation", () => {
  const relative = { alpha: 90, beta: 0, absolute: false };
  assert.equal(compassHeading(relative), null);
  assert.deepEqual(compassHeading({ ...relative, absolute: true }), { degrees: 270 });
  assert.deepEqual(compassHeading({ ...relative, absolute: true }, 90), { degrees: 0 });
  assert.equal(compassHeading({ ...relative, absolute: true, beta: 90 }), null);
  assert.equal(compassHeading({ ...relative, webkitCompassHeading: 20, webkitCompassAccuracy: -1 }), null);
  assert.equal(compassHeading({ ...relative, webkitCompassHeading: 359 }, 90)?.degrees, 89);
  const tilted = compassHeading({ alpha: 0, beta: 30, gamma: 45, absolute: true }, 90)!;
  assert.ok(Math.abs(tilted.degrees - 63.4349488) < .0001);
  assert.equal(headingDifference(1, 359), 2);
  assert.equal(headingDifference(359, 1), -2);
});
