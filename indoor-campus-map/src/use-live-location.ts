import { createContext, useContext, useEffect, useRef, useState } from "react";
import { LiveLocationController, sensorIsFresh } from "./live-location";
import { nativeLocationEnvironment } from './native-location';
import type { LiveLocationState, LocationEnvironment, OrientationReading, TrackingMode } from "./live-location";

// The production app uses browser sensors. A separate, explicitly labelled test
// page can inject fixtures without modifying browser APIs or real permissions.
export const LocationEnvironmentContext = createContext<LocationEnvironment | null>(null);

function browserEnvironment() {
  return {
    geolocation: navigator.geolocation,
    now: () => Date.now(),
    screenAngle: () => screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0,
    requestCompass: async (): Promise<"granted" | "denied" | "unavailable"> => {
      const api = (window as Window & { DeviceOrientationEvent?: { requestPermission?: (absolute?: boolean) => Promise<"granted" | "denied"> } }).DeviceOrientationEvent;
      if (!api) return "unavailable";
      return api.requestPermission ? api.requestPermission(true) : "granted";
    },
    listen: (callback: (event: OrientationReading) => void) => {
      const listener = (event: Event) => callback(event as DeviceOrientationEvent);
      window.addEventListener("deviceorientation", listener);
      window.addEventListener("deviceorientationabsolute", listener);
      return () => {
        window.removeEventListener("deviceorientation", listener);
        window.removeEventListener("deviceorientationabsolute", listener);
      };
    },
  };
}

export function useLiveLocation(enabled: boolean) {
  const injectedEnvironment = useContext(LocationEnvironmentContext);
  const controller = useRef<LiveLocationController | null>(null);
  const [state, setState] = useState<LiveLocationState>({ fix: null, compass: null, mode: "free", active: false, loading: false, centerRequest: 0, message: "", compassMessage: "" });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const live = new LiveLocationController(injectedEnvironment ?? nativeLocationEnvironment() ?? browserEnvironment(), setState);
    controller.current = live;
    let resume: TrackingMode | null = null;
    const visibility = () => {
      if (document.hidden && live.state.active) {
        resume = live.state.mode;
        live.stop();
      } else if (!document.hidden && resume !== null) {
        const mode = resume;
        resume = null;
        live.start(mode);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      live.stop();
      controller.current = null;
    };
  }, [enabled, injectedEnvironment]);
  useEffect(() => {
    if (!state.active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.active]);
  const fixFresh = !!state.fix && sensorIsFresh(state.fix.timestamp, Math.max(now, Date.now()), 30000);
  const compassFresh = !!state.compass && sensorIsFresh(state.compass.timestamp, Math.max(now, Date.now()), 5000);
  return {
    ...state,
    fix: fixFresh ? state.fix : null,
    compass: compassFresh ? state.compass : null,
    message: state.message || (state.active && state.fix && !fixFresh ? "GPS location is stale. Waiting for a fresh fix…" : ""),
    compassMessage: state.compassMessage || (state.compass && !compassFresh ? "Compass signal paused. Waiting for a fresh heading…" : ""),
    start: (mode: TrackingMode = "follow") => { if (enabled) controller.current?.start(mode); },
    browse: () => controller.current?.browse(),
    stop: () => controller.current?.stop(),
  };
}
