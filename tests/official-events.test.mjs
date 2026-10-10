import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFeed, plainText } from '../supabase/functions/sync-official-events/normalize.ts';
import { formatOfficialEvent } from '../src/lib/event-format.ts';

const sample = {
  id: '11111111111111111111111111111111', title: 'Coffee &amp; community',
  url: 'https://events.wlu.ca/2026/oct/coffee.html', startDate: '2026-10-10T10:00-0400', endDate: '2026-10-10T11:00-0400',
  description: '<p>Meet at Laurier&#8217;s campus.</p>', allDay: 'false', recurringEvent: 'false',
  filter1: ['Waterloo'], filter3: ['Social'], additionDetails: [{ icon: 'fas fa-building', text: 'Lazaridis Hall' }],
  contactDetails: { name: 'Campus team', email: 'private@example.com', phone: '5551234' },
  image: { url: 'https://example.com/tracker.jpg' },
};
const feed = (events = [sample]) => ({ events, cmsEventCount: String(events.length), lastPublished: 'Oct 10 2026' });
const recurring = (overrides = {}) => ({ ...sample, recurringEvent: 'true', startDate: '2026-10-25T10:00-0400', endDate: '2026-10-25T11:00-0400',
  recurringDetails: { recurInterval: '1', recurFrequency: 'weekly', recurDays: ['Sun'], recurMonth: 'day of the month', recurUntilDate: '2026-11-16T00:00-0500', recurCancellations: ['2026-11-08T12:00-0500'], ...overrides } });

test('official data is plain text and does not import personal contacts or images', () => {
  const [event] = normalizeFeed(feed()).events;
  assert.equal(event.title, 'Coffee & community'); assert.equal(event.description, 'Meet at Laurier’s campus.');
  assert.equal(event.cost, ''); assert.equal(event.place, 'Lazaridis Hall');
  assert.ok(!JSON.stringify(event).includes('private@example.com')); assert.ok(!JSON.stringify(event).includes('tracker.jpg'));
  assert.equal(plainText('<script>alert(1)</script><b>hello</b>'), 'hello');
});
test('only Waterloo or online events enter the shared feed', () => {
  assert.equal(normalizeFeed(feed([{ ...sample, filter1: ['Brantford'] }])).events.length, 0);
  assert.equal(normalizeFeed(feed([{ ...sample, filter1: ['Online'], additionDetails: [] }])).events[0].place, 'Online');
});
test('truncated feeds, duplicate ids, unsupported recurrences and unsafe URLs reject the snapshot', () => {
  assert.throws(() => normalizeFeed({ ...feed(), cmsEventCount: '2' }));
  assert.throws(() => normalizeFeed(feed([sample, sample])));
  assert.throws(() => normalizeFeed(feed([{ ...sample, url: 'https://evil.example/2026/oct/coffee.html' }])));
  assert.throws(() => normalizeFeed(feed([recurring({ recurFrequency: 'unknown' })])));
  assert.throws(() => normalizeFeed(feed([{ ...sample, startDate: 'invalid' }])));
  assert.throws(() => normalizeFeed(feed([{ ...sample, startDate: '2026-02-31T10:00-0500' }])));
});
test('inconsistent publisher end dates are omitted without inventing dates', () => {
  const result = normalizeFeed(feed([{ ...sample, endDate: '2026-10-09T11:00-0400' }]));
  assert.equal(result.events.length, 0); assert.equal(result.excludedInvalidDates, 1);
});
test('weekly occurrences retain local time across DST and omit cancelled calendar days', () => {
  const events = normalizeFeed(feed([recurring()])).events;
  assert.deepEqual(events.map(e => e.starts_at), ['2026-10-25T14:00:00.000Z', '2026-11-01T15:00:00.000Z', '2026-11-15T15:00:00.000Z']);
  assert.deepEqual(events.map(e => e.ends_at), ['2026-10-25T15:00:00.000Z', '2026-11-01T16:00:00.000Z', '2026-11-15T16:00:00.000Z']);
});
test('monthly invalid dates are skipped and publisher until timestamp is respected', () => {
  const event = { ...recurring({ recurFrequency: 'monthly', recurDays: [], recurUntilDate: '2026-12-30T00:00-0500', recurCancellations: [] }), startDate: '2026-09-30T14:30-0400', endDate: '2026-09-30T16:00-0400' };
  assert.deepEqual(normalizeFeed(feed([event])).events.map(e => e.starts_at.slice(0, 10)), ['2026-09-30', '2026-10-30', '2026-11-30']);
});
test('one-time event ids survive schedule edits and recurring occurrence ids survive caption edits', () => {
  assert.equal(normalizeFeed(feed([{ ...sample, startDate: '2026-10-10T10:30-0400' }])).events[0].id, sample.id);
  assert.deepEqual(normalizeFeed(feed([recurring()])).events.map(e => e.id), normalizeFeed(feed([{ ...recurring(), title: 'New title' }])).events.map(e => e.id));
});
test('all-day and multi-day schedules remain explicit regardless of device timezone', () => {
  const row = normalizeFeed(feed([{ ...sample, startDate: '2026-10-10T23:59-0400', endDate: '2026-10-12T23:59-0400', allDay: 'true' }])).events[0];
  const display = formatOfficialEvent(row); assert.equal(display.time, 'All day'); assert.equal(display.day, '10'); assert.match(display.dateLabel, /Oct 10.*Oct 12/);
  const timed = formatOfficialEvent(normalizeFeed(feed()).events[0]); assert.match(timed.time, /10:00.*11:00/);
});
