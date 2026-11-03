-- Signing, owner opt-in, device delivery and notification navigation verified.
update private.nightlife_push_settings set enabled=true;
select cron.alter_job((select jobid from cron.job where jobname='dispatch-nightlife-notifications'),command:=$job$
 select net.http_post(url:='https://ekptnmermhvtrdqpjwwa.supabase.co/functions/v1/dispatch-nightlife-notifications',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='nightlife_push_dispatch_token')),body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$,active:=true);
