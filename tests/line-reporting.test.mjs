import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentLineStatus, isLineReportingOpen, lineNightDate, lineWaitLabel } from '../src/lib/line-reporting.ts';
import { lineVenues } from '../src/data/line-venues.ts';

test('line reporting targets the four requested venues', () => {
  assert.deepEqual(lineVenues.map(venue => venue.id), ['pub', 'prohibition', 'rare', 'kentucky']);
});

test('a Waterloo nightlife date survives midnight and daylight-saving changes', () => {
  assert.equal(lineNightDate(new Date('2026-09-30T23:30:00Z')), '2026-09-30');
  assert.equal(lineNightDate(new Date('2026-10-01T05:30:00Z')), '2026-09-30');
  assert.equal(lineNightDate(new Date('2026-10-01T10:00:00Z')), '2026-10-01');
  assert.equal(lineNightDate(new Date('2026-11-01T06:30:00Z')), '2026-10-31');
  assert.equal(isLineReportingOpen(new Date('2026-10-01T02:00:00Z')), true);
  assert.equal(isLineReportingOpen(new Date('2026-10-01T15:00:00Z')), false);
});

test('only reports from this night and the last 90 minutes appear current', () => {
  const now = new Date('2026-10-01T02:00:00Z');
  const report = { venue_id: 'rare', night_date: '2026-09-30', wait_minutes: 15, report_count: 2, last_reported_at: '2026-10-01T01:00:00Z' };
  assert.deepEqual(currentLineStatus(report, now), report);
  assert.equal(currentLineStatus({ ...report, last_reported_at: '2026-10-01T00:29:59Z' }, now), null);
  assert.equal(currentLineStatus({ ...report, night_date: '2026-09-29' }, now), null);
  assert.equal(lineWaitLabel(15), '10–20 min');
});
