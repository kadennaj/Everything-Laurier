# Official Laurier calendar integration findings

Checked October 10, 2026. The event integration is not implemented yet; this records feasibility and a concrete source, separate from the post-menu UI change.

Laurier publishes a public JSON feed linked directly from its official calendar:

- Calendar: https://events.wlu.ca/
- JSON: https://events.wlu.ca/_data/current-live.json
- Official feed instructions: https://www.wlu.ca/information-for/community-members/events/calendar.html

The live JSON request returned an object containing `lastPublished`, `current`, `cmsEventCount` and an `events` array with 226 entries. This is a snapshot count, not a promise that all entries are upcoming Waterloo events. The feed describes its range as upcoming events plus the previous month. It includes events across campuses and online; do not display the whole array as Waterloo events without filtering.

Observed fields include stable event `id`, HTML-entity-encoded `title`, official `url`, offset-bearing `startDate`/`endDate`, description, all-day/recurrence flags, additional location/ticket/price details, organizer contact fields, campus values in `filter1`, audience in `filter2`, and category in `filter3`.

Recommended implementation: scheduled backend import to a shared read-only Supabase event cache every few hours. Use public feed data rather than page scraping, keep only appropriate Waterloo/online listings, decode entities as plain text, preserve time-zone offsets and all-day/multiday behavior, retain official source links, and remove cancelled/withdrawn listings on each successful complete feed import. A failed or incomplete fetch must preserve the last successful cache and expose its freshness rather than silently showing an empty calendar. Avoid importing contact details or remote images that the UI does not need. App opens and refreshes read the cache and do not call the upstream feed individually.

Connect the shared events provider to Discover, event detail, Search and Saved together; the current app uses an empty static array in all four. Preserve bookmark IDs through schedule edits, handle missing/withdrawn bookmarked events honestly, and add loading/network-failure/empty states. Attribute the official calendar and link users to its detail pages for tickets and changes. Public subscription availability establishes a technical feed, not evidence of authorization for every image or branding asset.

No paid scraping service or additional AI service is technically needed for this feed. Hosting/database usage would still depend on the deployed implementation and traffic.
