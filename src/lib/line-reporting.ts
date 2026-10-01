export type LineStatus = {
  venue_id: string;
  night_date: string;
  wait_minutes: number | null;
  report_count: number;
  last_reported_at: string | null;
};

export const lineOptions = [
  { minutes: 0, label: 'No line' },
  { minutes: 5, label: 'Under 10 min' },
  { minutes: 15, label: '10–20 min' },
  { minutes: 30, label: '20–40 min' },
  { minutes: 45, label: '40+ min' },
] as const;

function waterlooParts(at: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(at);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour') };
}

export function isLineReportingOpen(at = new Date()) {
  const { hour } = waterlooParts(at);
  return hour >= 18 || hour < 5;
}

export function lineNightDate(at = new Date()) {
  const { year, month, day, hour } = waterlooParts(at);
  return new Date(Date.UTC(year, month - 1, day - (hour < 6 ? 1 : 0))).toISOString().slice(0, 10);
}

export function currentLineStatus(status: LineStatus | undefined, at = new Date()) {
  if (!status?.last_reported_at || status.night_date !== lineNightDate(at) || !status.report_count) return null;
  const age = at.getTime() - new Date(status.last_reported_at).getTime();
  return age >= -120_000 && age < 90 * 60_000 ? status : null;
}

export function lineWaitLabel(minutes: number | null) {
  return lineOptions.find(option => option.minutes === minutes)?.label ?? 'No recent reports';
}

export function lineTimeAgo(iso: string, at = new Date()) {
  const minutes = Math.max(0, Math.floor((at.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 2) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min ago`;
}
