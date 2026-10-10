# Official Laurier calendar

Implemented and deployed October 10, 2026.

The app uses Laurier’s published JSON feed, rather than scraping event pages:

- Official calendar: https://events.wlu.ca/
- Public feed: https://events.wlu.ca/_data/current-live.json
- Laurier’s subscription instructions: https://www.wlu.ca/information-for/community-members/events/calendar.html

## Refresh and app behavior

The live `sync-official-events-every-8-hours` job runs at `15 */8 * * *` in UTC (three times daily). The importer is deployed to Supabase project `ekptnmermhvtrdqpjwwa`. No paid scraping provider, AI service, new device permission, or purchase was added.

The importer keeps listings marked Waterloo or Online. Discover and Search show current/upcoming occurrences; Saved and event details can also show recent past listings retained by the official feed. This is a rolling published calendar, not a guarantee that every event for the school year is already announced. New events, edits, withdrawals and recurring cancellations appear after a successful scheduled import. An eight-hour interval means changes can take up to about eight hours to import, plus the app’s cache-read interval and any upstream publication delay.

Discover, Search, Saved and event details share one provider. Opening the app loads a public database snapshot. While active, the app checks that shared cache about every fifteen minutes and after returning to the foreground if needed. Simultaneous reads are deduplicated. App opens, reloads and retries do not trigger a Laurier feed fetch. Displayed timestamps identify the last successful import; a delayed refresh warns that listings may be stale. Failed app reads retain previously loaded events during that app session. A fresh app session without network access shows an error and retry; it does not have a persistent offline calendar.

Event cards and details show real titles, dates, explicit all-day/multi-day schedules, location and price when supplied, public organizer names when supplied, and links to official listings for registration and current details. Times use America/Toronto, regardless of device timezone. Artwork is the app’s own decorative illustration with no invented event names; source images, contact emails and phone fields are not imported.

## Source validation and recurring events

The importer checks complete response counts, unique publisher IDs, campus fields, offset-bearing calendar dates and HTTPS links on events.wlu.ca. One-time IDs stay stable across schedule edits. Recurring occurrence IDs combine the publisher ID with the local occurrence date; caption and time edits on the same date retain bookmarks. A rescheduled recurrence on a different date is a different occurrence. Missing/expired saved listings are explained and their bookmarks can be removed.

Daily, weekly, monthly and yearly recurrence rules use Toronto wall-clock time with daylight-saving changes. Cancellation dates remove that day’s occurrence. Monthly nonexistent dates are skipped. The publisher’s exact until timestamp is respected, including midnight cutoffs. Unsupported/malformed rules reject the update, retaining the last good snapshot; no replacement schedule is invented.

The initial source snapshot contained 226 publisher records. Three Waterloo/online listings had end timestamps preceding start timestamps and were excluded (Waterloo Fall Open House, one Accessible Learning co-working session, Sparking Student Engagement). This is an upstream data inconsistency; dates were not guessed. After recurrence expansion, the deployed cache held 221 occurrences, including 143 upcoming/current occurrences at verification. Counts change over time.

## Backend and security

Apply `supabase/schema/official_events.sql`, deploy `supabase/functions/sync-official-events`, then run `supabase/schema/official_events_schedule.sql`. Fresh installations need a random server-only sync token in Vault named `instagram_feed_sync_secret`, with its SHA-256 hash configured as `FEED_SYNC_TOKEN_HASH`. The current project reuses its existing private feed-sync credential; no secret is shipped in the app or Git.

The function requires a POST and verifies the bearer token’s SHA-256 digest with constant-time comparison before network activity. Its gateway JWT check is disabled because it performs that custom server authentication. It fetches only the fixed HTTPS official endpoint without account information or private headers, limits response size and time, and keeps service credentials server-side.

The service-only `replace_official_events` RPC atomically replaces listings and freshness, so withdrawals disappear only after a complete successful import. Invalid updates roll back; an advisory transaction lock and observed-time comparison prevent older overlapping runs from overwriting newer runs. Anonymous/authenticated roles only have SELECT and execute on the read-only `official_event_feed` snapshot RPC. They cannot write listings or execute replacement.

## Verification

- Initial authorized live import returned HTTP 200 with 221 occurrences and three inconsistent-date exclusions.
- Anonymous HTTPS snapshot read returned HTTP 200 with 221 occurrences; unauthorized replacement and direct unauthenticated import returned HTTP 401.
- Live rolled-back `tests/official-events-rls.sql` verified read access, denied writes, atomic failed-snapshot retention, older-run rejection and withdrawal handling.
- Node tests cover source validation, recurrence/DST/cancellations, stable IDs, date display, importer authentication, failure retention, provider deduplication and foreground/cache intervals.
- App lint, TypeScript and web export passed. Browser/native visual verification remains unavailable because the existing local app browser access was denied by an administrator-enforced security policy. This feature has not been tested in a fresh signed native build.

Public subscription availability establishes the technical feed; it does not certify branding/redistribution rights or App Store approval. The existing release audit and remaining submission requirements still apply.
