export type TrackingMode = "free" | "center" | "follow" | "heading";
export interface GPSFix { latitude: number; longitude: number; accuracy: number; timestamp: number }
export interface CompassFix { degrees: number; accuracy?: number; timestamp: number }
export interface LiveLocationState {
  fix: GPSFix | null;
  compass: CompassFix | null;
  mode: TrackingMode;
  active: boolean;
  loading: boolean;
  centerRequest: number;
  message: string;
  compassMessage: string;
}
export interface OrientationReading {
  alpha: number | null;
  beta: number | null;
  gamma?: number | null;
  absolute: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}
export const normalizeHeading = (degrees: number) => ((degrees % 360) + 360) % 360;
export const headingDifference = (a: number, b: number) => ((a - b + 540) % 360) - 180;
export const sensorIsFresh = (timestamp: number, now: number, maxAge: number) => Number.isFinite(timestamp) && now - timestamp <= maxAge && timestamp - now <= 5000;
export function compassHeading(event: OrientationReading, screenAngle = 0): { degrees: number; accuracy?: number } | null {
  if (Number.isFinite(event.webkitCompassHeading)) {
    if (event.webkitCompassAccuracy !== undefined && (!Number.isFinite(event.webkitCompassAccuracy) || event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > 90)) return null;
    return { degrees: normalizeHeading(event.webkitCompassHeading! + screenAngle), accuracy: event.webkitCompassAccuracy };
  }
  // Relative alpha and GPS course are not physical compass headings. A nearly
  // upright device has no stable horizontal screen-top direction in this fallback.
  if (!event.absolute || event.alpha === null || !Number.isFinite(event.alpha) || event.beta === null || !Number.isFinite(event.beta)) return null;
  const alpha = event.alpha * Math.PI / 180, beta = event.beta * Math.PI / 180;
  const angle = screenAngle * Math.PI / 180;
  if (Math.abs(Math.sin(angle)) > .01 && (event.gamma === null || (event.gamma !== undefined && !Number.isFinite(event.gamma)))) return null;
  const gamma = (event.gamma ?? 0) * Math.PI / 180;
  // Project the visible screen's top into the Earth east/north plane using the
  // absolute orientation's Z-X-Y rotation, including landscape device tilt.
  const east = (Math.cos(alpha) * Math.cos(gamma) - Math.sin(alpha) * Math.sin(beta) * Math.sin(gamma)) * Math.sin(angle) - Math.sin(alpha) * Math.cos(beta) * Math.cos(angle);
  const north = (Math.sin(alpha) * Math.cos(gamma) + Math.cos(alpha) * Math.sin(beta) * Math.sin(gamma)) * Math.sin(angle) + Math.cos(alpha) * Math.cos(beta) * Math.cos(angle);
  if (Math.hypot(east, north) < .15) return null;
  return { degrees: normalizeHeading(Math.atan2(east, north) * 180 / Math.PI) };
}
export interface LocationEnvironment {
  geolocation?: Pick<Geolocation, "watchPosition" | "clearWatch">;
  listen: (callback: (event: OrientationReading) => void) => () => void;
  requestCompass: () => Promise<"granted" | "denied" | "unavailable">;
  screenAngle: () => number;
  now: () => number;
}

// Owns exactly one GPS watch and one pair of compass listeners. Injected browser
// APIs let lifecycle/race handling be checked without pretending to have real GPS.
export class LiveLocationController {
  state: LiveLocationState = { fix: null, compass: null, mode: "free", active: false, loading: false, centerRequest: 0, message: "", compassMessage: "" };
  private watch: number | null = null;
  private removeCompass: (() => void) | null = null;
  private generation = 0;
  private compassGranted = false;
  private compassPending = false;
  private env: LocationEnvironment;
  private changed: (state: LiveLocationState) => void;
  constructor(env: LocationEnvironment, changed: (state: LiveLocationState) => void) {
    this.env = env;
    this.changed = changed;
  }
  private publish(patch: Partial<LiveLocationState>) {
    this.state = { ...this.state, ...patch };
    this.changed(this.state);
  }
  start(mode: TrackingMode = "follow") {
    if (!this.env.geolocation) {
      this.publish({ message: "GPS is unavailable in this browser. Choose a campus starting point.", loading: false });
      return;
    }
    this.publish({ mode, centerRequest: this.state.centerRequest + 1 });
    if (!this.state.active) {
      const generation = ++this.generation;
      this.publish({ active: true, loading: !this.state.fix, message: "Finding your live location…" });
      try {
        const watch = this.env.geolocation.watchPosition(position => {
          if (generation !== this.generation) return;
          const c = position.coords;
          if (!Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180 || !Number.isFinite(c.accuracy) || c.accuracy < 0 || !sensorIsFresh(position.timestamp, this.env.now(), 30000) || (this.state.fix && position.timestamp < this.state.fix.timestamp)) return;
          this.publish({ fix: { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, timestamp: position.timestamp }, loading: false, message: "" });
        }, error => {
          if (generation !== this.generation) return;
          if (error.code === 1) {
            this.stop();
            this.publish({ message: "Location permission was denied. Enable it in browser settings or choose a campus place." });
          } else this.publish({ loading: false, message: "GPS signal unavailable. Waiting for a fresh location…" });
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
        if (generation === this.generation) this.watch = watch;
        else this.env.geolocation.clearWatch(watch);
      } catch {
        this.stop();
        this.publish({ message: "GPS could not start. Use HTTPS or localhost and enable location access." });
      }
    }
    if (this.state.active) void this.enableCompass();
  }
  async enableCompass() {
    if (this.removeCompass || this.compassPending || !this.state.active) return;
    const generation = this.generation;
    this.compassPending = true;
    try {
      const permission = this.compassGranted ? "granted" : await this.env.requestCompass();
      if (generation !== this.generation) return;
      if (permission !== "granted") {
        this.publish({ compass: null, compassMessage: permission === "denied" ? "Compass permission denied. GPS follow still works." : "Compass unavailable on this device. GPS follow still works." });
        return;
      }
      this.compassGranted = true;
      this.publish({ compassMessage: "Waiting for device compass. Hold your phone flatter if needed; some browsers do not provide compass readings." });
      this.removeCompass = this.env.listen(event => {
        if (generation !== this.generation) return;
        const reading = compassHeading(event, this.env.screenAngle());
        if (!reading) return;
        const now = this.env.now(), old = this.state.compass;
        if (old && now - old.timestamp < 100) return;
        this.publish({ compass: { ...reading, timestamp: now }, compassMessage: "" });
      });
    } catch {
      if (generation === this.generation) this.publish({ compass: null, compassMessage: "Compass access could not start. Tap Follow heading to retry." });
    } finally { if (generation === this.generation) this.compassPending = false; }
  }
  browse() { this.publish({ mode: "free" }); }
  stop(clearFix = true) {
    this.generation++;
    if (this.watch !== null) this.env.geolocation?.clearWatch(this.watch);
    this.watch = null;
    this.removeCompass?.();
    this.removeCompass = null;
    this.compassPending = false;
    this.publish({ active: false, loading: false, mode: "free", compass: null, compassMessage: "", fix: clearFix ? null : this.state.fix });
  }
}
