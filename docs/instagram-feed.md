# Recent Instagram posts

The Nightlife screen shows recent posts from `@rarenightclub`, `@prohibitionwarehouse`, `@thepubonking`, and `@kentuckywaterloo`. The app reads a public, read-only Supabase table. A Supabase Edge Function fetches posts through [Apify's Instagram Scraper](https://apify.com/apify/instagram-scraper) and saves the source URL, caption, post date, and an optional preview image. The function's Apify token never enters the app or Git. Posts are source-linked venue announcements, not verified event listings; users should confirm dates, entry terms, and availability with the venue.

The feed deliberately has no invented posts. Until Apify is connected or when no posts were published in the past week, the screen links directly to all four Instagram accounts. Instagram can change access or remove posts, and preview image URLs can expire; the card still links to the original post.

## Turn on updates

1. Create an [Apify account](https://console.apify.com/) and open its [Instagram Scraper](https://apify.com/apify/instagram-scraper). Get an API token from Apify account settings. The function requests at most four posts per account from the past seven days. The sample `humansofny` URL and 100-result limit are replaced with the four venue URLs and a small limit.
2. In the Everything-Laurier Supabase project, open **Edge Functions → Secrets**. Save `APIFY_TOKEN` with the Apify token. The existing secret named `APIFY API` is also supported until it is rotated. Never put the token in an `EXPO_PUBLIC_` variable.
3. The project's `pg_cron` and `pg_net` extensions are already enabled. A random 32-byte sync token is stored in Vault as `instagram_feed_sync_secret`; only its SHA-256 hash is in the Edge Function code. Run `supabase/schema/instagram_feed_schedule.sql` to schedule updates every eight hours. The request uses `Authorization: Bearer <sync token>` as described in the [Supabase scheduling guide](https://supabase.com/docs/guides/functions/schedule-functions). The function is deployed with JWT verification disabled because it validates this separate server-only token itself. If the token is rotated, update the hash in the Edge Function at the same time.
4. Invoke the function once with that secret to populate the first posts. Confirm that the Nightlife screen shows posts and a preview update time. Check the function logs if the provider responds with an error. Only the server function can write the table; app clients can read it.

The function calls Apify only when invoked by the schedule, never when a student opens or refreshes the app. It caps each run at **US$0.05** through Apify's `maxTotalChargeUsd` option. Apify currently lists **US$2.70 per 1,000 results on its free plan**; at most 16 results every eight hours cost about **US$4.02 per 31-day month** at that rate. The per-run cap gives a separate ceiling of US$4.65 for 93 scheduled runs in a 31-day month. These estimates exclude other Apify usage, manual runs, and pricing changes; the US$5 monthly free credit is account-wide. Confirm the [current Actor pricing](https://apify.com/apify/instagram-scraper/pricing) and set an Apify account spending limit.

## Code and checks

- `supabase/schema/instagram_feed_posts.sql` defines the read-only public table and Row Level Security.
- `supabase/functions/sync-instagram-feed` validates the four authors and source links before saving posts.
- `src/components/InstagramFeed.tsx` displays fetched posts or honest empty/error states.
- `node --experimental-strip-types --test tests/instagram-feed.test.mjs` checks post normalization and rejects unrelated authors or unsafe links.

Apify uses scraping to obtain public posts. Check the provider's reliability and your right to use the content before relying on this in production; Meta's [official API](https://developers.facebook.com/docs/instagram-platform/) is the better option if you later gain the required account access.
