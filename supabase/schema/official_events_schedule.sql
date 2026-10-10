-- Reuse the existing server-only random token from Vault. Its hash is in the function.
select cron.schedule('sync-official-events-every-8-hours', '15 */8 * * *', $cron$
  select net.http_post(
    url := 'https://ekptnmermhvtrdqpjwwa.supabase.co/functions/v1/sync-official-events',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_feed_sync_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$cron$);
