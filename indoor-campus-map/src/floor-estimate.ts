/** Relative height is a floor-change hint, never a room fix or surveyed elevation. */
export interface ElevationReading { metres: number; timestamp: number; session: number }
export interface FloorEstimate { floor: number | null; delta: number | null; status: 'calibrating' | 'estimated' | 'uncertain' | 'expired' }
export class FloorEstimator {
  private readings: ElevationReading[] = [];
  private baseline: number | null = null;
  private session: number | null = null;
  private started: number;
  private baseFloor: number;
  private levels: number[];
  private height: number;
  constructor(baseFloor: number, levels: number[], height = 3.5, now = Date.now()) {
    this.baseFloor = baseFloor; this.levels = levels; this.height = height; this.started = now;
  }
  update(reading: ElevationReading, now = Date.now()): FloorEstimate {
    const expired: FloorEstimate = {floor: null, delta: null, status: 'expired'};
    if (now - this.started > 600000 || now < this.started || !Number.isFinite(this.height) || this.height < 2.5 || this.height > 6) return expired;
    if (!Number.isFinite(reading.metres) || !Number.isFinite(reading.timestamp) || now - reading.timestamp > 6000 || reading.timestamp > now + 1000) return {floor: null, delta: null, status: 'uncertain'};
    // Restarted native sensor sessions have a new zero. Never compare their heights.
    if (this.session !== null && this.session !== reading.session) return expired;
    this.session = reading.session;
    const last = this.readings.at(-1);
    if (last && reading.timestamp <= last.timestamp) return {floor: null, delta: null, status: 'uncertain'};
    this.readings = [...this.readings, reading].filter(r => reading.timestamp - r.timestamp <= 5000).slice(-6);
    const values = this.readings.map(r => r.metres).sort((a,b) => a-b);
    const median = values[Math.floor(values.length / 2)];
    const stable = values.length >= 4 && reading.timestamp - this.readings[0].timestamp >= 3000 && values.at(-1)! - values[0] < .65;
    if (this.baseline === null) {
      if (stable) this.baseline = median;
      else return {floor: null, delta: null, status: 'calibrating'};
    }
    const delta = median - this.baseline;
    const difference = Math.round(delta / this.height);
    const candidate = this.baseFloor + difference;
    const plausible = stable && Math.abs(delta - difference * this.height) <= .7 && this.levels.includes(candidate);
    return {floor: plausible ? candidate : null, delta, status: plausible ? 'estimated' : 'uncertain'};
  }
}
