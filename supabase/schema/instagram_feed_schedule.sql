-- Run only after APIFY_TOKEN and FEED_SYNC_SECRET are set on the Edge Function,
-- and the same FEED_SYNC_SECRET is saved in Vault as instagram_feed_sync_secret.
select cron.schedule(
  'sync-instagram-feed-every-3-hours',
  '0 */3 * * *',
  $cron$
    select net.http_post(
      url := 'https://ekptnmermhvtrdqpjwwa.supabase.co/functions/v1/sync-instagram-feed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'instagram_feed_sync_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $cron$
);
