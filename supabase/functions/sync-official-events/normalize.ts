export const SOURCE_URL = 'https://events.wlu.ca/_data/current-live.json';
type Detail = { icon: string; text: string };
type PublisherEvent = {
  id: string; title: string; url: string; startDate: string; endDate: string;
  description?: string; allDay: string; recurringEvent: string;
  filter1: string[]; filter3?: string[]; additionDetails?: Detail[];
  contactDetails?: { name?: string };
  recurringDetails?: { recurInterval: string; recurFrequency: string; recurDays: string[];
    recurMonth: string; recurUntilDate: string; recurCancellations: string[] };
};
export type OfficialEvent = {
  id: string; title: string; category: string; starts_at: string; ends_at: string;
  all_day: boolean; place: string; cost: string; description: string; host: string;
  campus: string[]; source_url: string;
};

export function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const entities: Record<string, string> = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>',
    nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…' };
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
      if (!code.startsWith('#')) return entities[code] ?? whole;
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
    }).replace(/\s+/g, ' ').trim().slice(0, 20000);
}
function publisherDate(value: string): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+-]\d{4}$/.test(value)) throw Error('Invalid publisher date');
  const [year, month, day, hour, minute] = value.slice(0, 16).split(/[-T:]/).map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day || hour > 23 || minute > 59) throw Error('Invalid publisher date');
  const result = Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  if (!Number.isFinite(result)) throw Error('Invalid publisher date');
  return result;
}
const zoned = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
// A UTC-shaped value represents a local calendar date/time, never an actual instant.
function wallClock(instant: number) {
  const p = Object.fromEntries(zoned.formatToParts(instant).map(part => [part.type, part.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
}
function instantFromWall(wall: number): number {
  let instant = wall;
  for (let i = 0; i < 4; i++) instant += wall - wallClock(instant);
  if (wallClock(instant) !== wall) throw Error('Nonexistent local recurrence time');
  return instant;
}
const DAY = 86400000;
function occurrences(e: PublisherEvent): [number, number, string][] {
  const start = publisherDate(e.startDate), end = publisherDate(e.endDate);
  if (end < start) throw Error('Event ends before it starts');
  if (e.recurringEvent === 'false') return [[start, end, e.id]];
  if (e.recurringEvent !== 'true' || !e.recurringDetails) throw Error('Invalid recurrence');
  const r = e.recurringDetails, interval = Number(r.recurInterval), until = publisherDate(r.recurUntilDate);
  if (!Number.isInteger(interval) || interval < 1 || interval > 365 || until < start || until - start > 3 * 366 * DAY) throw Error('Invalid recurrence range');
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(r.recurFrequency) || !Array.isArray(r.recurDays) || !Array.isArray(r.recurCancellations)) throw Error('Unsupported recurrence');
  if (r.recurFrequency === 'monthly' && !['day of the month', 'day of the week'].includes(r.recurMonth)) throw Error('Unsupported monthly recurrence');
  const anchor = new Date(wallClock(start)), lastDay = new Date(wallClock(until));
  const cancelled = new Set(r.recurCancellations.map(d => new Date(wallClock(publisherDate(d))).toISOString().slice(0, 10)));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (r.recurDays.some(d => !dayNames.includes(d))) throw Error('Invalid recurring weekday');
  const days = r.recurDays.length ? r.recurDays.map(d => dayNames.indexOf(d)) : [anchor.getUTCDay()];
  const firstDay = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
  const last = Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate());
  const weekAnchor = firstDay - anchor.getUTCDay() * DAY;
  const result: [number, number, string][] = [];
  for (let d = firstDay; d <= last; d += DAY) {
    const date = new Date(d), delta = (d - firstDay) / DAY;
    const monthDelta = (date.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + date.getUTCMonth() - anchor.getUTCMonth();
    const matches = r.recurFrequency === 'daily' ? delta % interval === 0
      : r.recurFrequency === 'weekly' ? Math.floor((d - weekAnchor) / (7 * DAY)) % interval === 0 && days.includes(date.getUTCDay())
      : r.recurFrequency === 'monthly' ? monthDelta % interval === 0 && (r.recurMonth === 'day of the month'
        ? date.getUTCDate() === anchor.getUTCDate()
        : date.getUTCDay() === anchor.getUTCDay() && Math.ceil(date.getUTCDate() / 7) === Math.ceil(anchor.getUTCDate() / 7))
      : (date.getUTCFullYear() - anchor.getUTCFullYear()) % interval === 0 && date.getUTCMonth() === anchor.getUTCMonth() && date.getUTCDate() === anchor.getUTCDate();
    const dateKey = date.toISOString().slice(0, 10);
    if (!matches || cancelled.has(dateKey)) continue;
    const nextStart = instantFromWall(d + anchor.getUTCHours() * 3600000 + anchor.getUTCMinutes() * 60000);
    // Match the publisher's until timestamp, including its midnight cutoff.
    if (nextStart > until) continue;
    const nextEnd = instantFromWall(wallClock(nextStart) + wallClock(end) - wallClock(start));
    result.push([nextStart, nextEnd, `${e.id}_${dateKey}`]);
  }
  return result;
}
export function normalizeFeed(raw: unknown): { events: OfficialEvent[]; published: string; excludedInvalidDates: number } {
  if (!raw || typeof raw !== 'object') throw Error('Invalid calendar response');
  const feed = raw as { events: PublisherEvent[]; cmsEventCount: string; lastPublished: string };
  if (!Array.isArray(feed.events) || feed.events.length > 2000 || Number(feed.cmsEventCount) !== feed.events.length || typeof feed.lastPublished !== 'string' || !feed.lastPublished.trim()) throw Error('Incomplete calendar response');
  const ids = new Set<string>(), result: OfficialEvent[] = []; let excludedInvalidDates = 0;
  for (const e of feed.events) {
    if (!e || !/^[a-f0-9]{32}$/.test(e.id) || ids.has(e.id) || !Array.isArray(e.filter1) || e.filter1.some(c => typeof c !== 'string')) throw Error('Invalid calendar event');
    ids.add(e.id);
    if (!e.filter1.some(c => c === 'Waterloo' || c === 'Online')) continue;
    // Omit an internally inconsistent publisher listing rather than inventing its end date.
    if (publisherDate(e.endDate) < publisherDate(e.startDate)) { excludedInvalidDates++; continue; }
    const url = new URL(e.url);
    if (url.origin !== 'https://events.wlu.ca' || url.username || url.password || url.search || url.hash || !/^\/(?:\d{4}\/[a-z]+|recurring)\/[a-z\d_-]+\.html$/.test(url.pathname)) throw Error('Invalid official event URL');
    const title = plainText(e.title);
    if (!title || !['true', 'false'].includes(e.allDay) || (e.additionDetails !== undefined && !Array.isArray(e.additionDetails))) throw Error('Invalid event details');
    const details = e.additionDetails ?? [];
    const place = details.filter(d => /fa-(building|map-marker-alt)/.test(d.icon)).map(d => plainText(d.text)).filter(Boolean).join(' · ');
    const cost = details.find(d => /fa-dollar-sign/.test(d.icon) || /^free$/i.test(plainText(d.text)))?.text;
    for (const [starts, ends, id] of occurrences(e)) result.push({ id, title, category: plainText(e.filter3?.[0]) || 'Campus event',
      starts_at: new Date(starts).toISOString(), ends_at: new Date(ends).toISOString(), all_day: e.allDay === 'true',
      place: place || (e.filter1.length === 1 && e.filter1[0] === 'Online' ? 'Online' : ''), cost: plainText(cost),
      description: plainText(e.description), host: plainText(e.contactDetails?.name), campus: e.filter1, source_url: url.href });
  }
  if (result.length > 5000) throw Error('Calendar expanded beyond safe limit');
  return { events: result.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id)), published: feed.lastPublished, excludedInvalidDates };
}
