-- Run after the Apify token is saved as APIFY_TOKEN (or APIFY API) in Edge Function
-- secrets and a random 32-byte sync token is saved in Vault as
-- instagram_feed_sync_secret. The Edge Function contains only its SHA-256 hash.
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
