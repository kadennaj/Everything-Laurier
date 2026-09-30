# Recent Instagram posts

The Nightlife screen shows recent posts from `@rarenightclub`, `@prohibitionwarehouse`, `@thepubonking`, and `@kentuckywaterloo`. The app reads a public, read-only Supabase table. A Supabase Edge Function fetches posts through [Apify's Instagram Post Scraper](https://apify.com/apify/instagram-post-scraper) and saves the source URL, caption, post date, and an optional preview image. The function's Apify token never enters the app or Git. Posts are source-linked venue announcements, not verified event listings; users should confirm dates, entry terms, and availability with the venue.

The feed deliberately has no invented posts. Until Apify is connected or when no posts were published in the past week, the screen links directly to all four Instagram accounts. Instagram can change access or remove posts, and preview image URLs can expire; the card still links to the original post.

## Turn on updates

1. Create an [Apify account](https://console.apify.com/) and open its [Instagram Post Scraper](https://apify.com/apify/instagram-post-scraper). Get an API token from Apify account settings. The function requests at most five posts per account from the past seven days and skips pinned posts.
2. In the Everything-Laurier Supabase project, open **Edge Functions → Secrets**. Save `APIFY_TOKEN` with the Apify token. Generate a separate random value and save it as `FEED_SYNC_SECRET`. Do not use the Supabase publishable key as this secret, and never put either token in an `EXPO_PUBLIC_` variable.
3. The project's `pg_cron` and `pg_net` extensions are already enabled. In SQL Editor, store that same `FEED_SYNC_SECRET` value in Vault as `instagram_feed_sync_secret`, then run `supabase/schema/instagram_feed_schedule.sql` to schedule updates every three hours. The request uses `Authorization: Bearer <FEED_SYNC_SECRET>` as described in the [Supabase scheduling guide](https://supabase.com/docs/guides/functions/schedule-functions). The function is deployed with JWT verification disabled because it validates this separate server-only secret itself.
4. Invoke the function once with that secret to populate the first posts. Confirm that the Nightlife screen shows posts and a preview update time. Check the function logs if the provider responds with an error. Only the server function can write the table; app clients can read it.

The function calls Apify only when invoked by the schedule, never when a student opens or refreshes the app. It caps each run at **US$0.10** through Apify's `maxTotalChargeUsd` option. Apify currently lists **US$1.70 per 1,000 basic posts on its free plan**; at the maximum 20 posts every three hours that is roughly **US$8.16 per 30 days**, before any pricing changes or plan differences. Confirm the [current Actor pricing](https://apify.com/apify/instagram-post-scraper/pricing) and set an Apify account spending limit before scheduling.

## Code and checks

- `supabase/schema/instagram_feed_posts.sql` defines the read-only public table and Row Level Security.
- `supabase/functions/sync-instagram-feed` validates the four authors and source links before saving posts.
- `src/components/InstagramFeed.tsx` displays fetched posts or honest empty/error states.
- `node --experimental-strip-types --test tests/instagram-feed.test.mjs` checks post normalization and rejects unrelated authors or unsafe links.

Apify uses scraping to obtain public posts. Check the provider's reliability and your right to use the content before relying on this in production; Meta's [official API](https://developers.facebook.com/docs/instagram-platform/) is the better option if you later gain the required account access.
