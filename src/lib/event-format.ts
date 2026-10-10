import type { CampusEvent } from '../data/content';

export type CachedOfficialEvent = {
  id: string; title: string; category: string; starts_at: string; ends_at: string;
  all_day: boolean; place: string; cost: string; description: string; host: string; source_url: string;
};
export function formatOfficialEvent(row: CachedOfficialEvent): CampusEvent {
  const start = new Date(row.starts_at), end = new Date(row.ends_at);
  const date = (d: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', ...options }).format(d);
  const day = date(start, { day: 'numeric' }), month = date(start, { month: 'short' });
  const fullDate = (d: Date) => date(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const clock = (d: Date) => date(d, { hour: 'numeric', minute: '2-digit', hour12: true });
  const sameDay = date(start, { year: 'numeric', month: 'numeric', day: 'numeric' }) === date(end, { year: 'numeric', month: 'numeric', day: 'numeric' });
  const time = row.all_day ? 'All day' : `${clock(start)}${start.getTime() === end.getTime() ? '' : ` – ${clock(end)}`}`;
  return { id: row.id, title: row.title, shortTitle: row.title, category: row.category,
    day, month, weekday: date(start, { weekday: 'long' }), time,
    dateLabel: sameDay ? fullDate(start) : `${fullDate(start)} – ${fullDate(end)}`,
    schedule: row.all_day ? 'All day' : sameDay ? time : `${fullDate(start)}, ${clock(start)} – ${fullDate(end)}, ${clock(end)}`,
    place: row.place, cost: row.cost, art: 'flower', color: '#E9E3F0', description: row.description,
    host: row.host, note: '', sourceUrl: row.source_url, startsAt: row.starts_at, endsAt: row.ends_at };
}
