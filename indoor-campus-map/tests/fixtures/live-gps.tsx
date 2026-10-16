import React from "react";
import { createRoot } from "react-dom/client";
import App from "../../src/App";
import { campus, pointToGeo } from "../../src/data";
import { LocationEnvironmentContext } from "../../src/use-live-location";
import type { LocationEnvironment, OrientationReading } from "../../src/live-location";
import "../../src/style.css";

let gps: PositionCallback | null = null;
let compass: ((reading: OrientationReading) => void) | null = null;
let point = campus.entrances.LIB.find(d => d.main)!.point;
let heading = 0;
let compassEnabled = true;
let serial = 0;
const emit = () => {
  const geo = pointToGeo(point);
  gps?.({ coords: { latitude: geo.lat, longitude: geo.lon, accuracy: 6, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) }, timestamp: Date.now(), toJSON: () => ({}) });
  if (compassEnabled) compass?.({ alpha: null, beta: null, absolute: false, webkitCompassHeading: heading, webkitCompassAccuracy: 8 });
};
const environment: LocationEnvironment = {
  geolocation: { watchPosition: callback => { gps = callback; queueMicrotask(emit); return ++serial; }, clearWatch: () => { gps = null; } },
  requestCompass: async () => "granted",
  listen: callback => { compass = callback; queueMicrotask(emit); return () => { compass = null; }; },
  screenAngle: () => 0,
  now: () => Date.now(),
};
document.querySelector("#east")!.addEventListener("click", () => { heading = 90; compassEnabled = true; emit(); });
document.querySelector("#north")!.addEventListener("click", () => { heading = 0; compassEnabled = true; emit(); });
document.querySelector("#move")!.addEventListener("click", () => { point = campus.entrances.AC[0].point; emit(); });
document.querySelector("#signal")!.addEventListener("click", () => { compassEnabled = false; });
setInterval(emit, 250);
const style = document.createElement("style");
style.textContent = "#sensor-fixture { position:fixed; inset:0 0 auto; z-index:100; display:flex; flex-wrap:wrap; align-items:center; gap:6px; background:#ffe9a8; padding:8px; font-size:10px; color:#6a3b00; } #sensor-fixture button { border:1px solid #bd9755; border-radius:5px; padding:6px; } #root { padding-top:48px; } .app { height:calc(100dvh - 48px); }";
document.head.append(style);
createRoot(document.getElementById("root")!).render(<React.StrictMode><LocationEnvironmentContext.Provider value={environment}><App /></LocationEnvironmentContext.Provider></React.StrictMode>);
