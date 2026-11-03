-- Opt-in venue alerts. No push token, session ID or delivery queue is public.
create table private.nightlife_notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 venues text[] not null default '{}',
 age_19_confirmed boolean not null default false,
 updated_at timestamptz not null default now(),
 check(cardinality(venues)<=4 and venues <@ array['rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo']::text[])
);
create table private.nightlife_push_devices (
 token text primary key check(char_length(token)<=256),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 platform text not null check(platform in ('ios','android')),
 created_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now()
);
create index nightlife_push_devices_user on private.nightlife_push_devices(user_id);
create index nightlife_push_devices_session on private.nightlife_push_devices(session_id);
create table private.nightlife_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 post_id text not null references public.instagram_feed_posts(id) on delete cascade,
 token text not null references private.nightlife_push_devices(token) on delete cascade,
 status text not null default 'pending' check(status in ('pending','sending','accepted','checking','delivered','failed')),
 ticket_id uuid,
 created_at timestamptz not null default now(),
 attempted_at timestamptz,
 checked_at timestamptz,
 receipt_checks integer not null default 0,
 unique(post_id,token)
);
create index nightlife_push_pending on private.nightlife_push_deliveries(created_at) where status='pending';
create index nightlife_push_receipts on private.nightlife_push_deliveries(attempted_at) where status='accepted';
create index nightlife_push_daily on private.nightlife_push_deliveries(token,attempted_at);
create index nightlife_push_post on private.nightlife_push_deliveries(post_id);
create table private.nightlife_push_settings (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 token_hash text not null,
 day date not null default current_date,
 attempts_today integer not null default 0
);
-- Vault generates the scheduler credential in the database. No secret in source.
do $$ declare secret text:=encode(extensions.gen_random_bytes(32),'hex'); begin
 perform vault.create_secret(secret,'nightlife_push_dispatch_token','Server-only nightlife delivery job');
 insert into private.nightlife_push_settings(token_hash) values(encode(extensions.digest(secret,'sha256'),'hex'));
end; $$;
alter table private.nightlife_notification_preferences enable row level security;
alter table private.nightlife_push_devices enable row level security;
alter table private.nightlife_push_deliveries enable row level security;
alter table private.nightlife_push_settings enable row level security;
revoke all on private.nightlife_notification_preferences,private.nightlife_push_devices,private.nightlife_push_deliveries,private.nightlife_push_settings from public,anon,authenticated;
create policy "No client table access" on private.nightlife_notification_preferences for all to anon,authenticated using(false) with check(false);
create policy "No client table access" on private.nightlife_push_devices for all to anon,authenticated using(false) with check(false);
create policy "No client table access" on private.nightlife_push_deliveries for all to anon,authenticated using(false) with check(false);
create policy "No client table access" on private.nightlife_push_settings for all to anon,authenticated using(false) with check(false);

create function private.nightlife_notifications(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare prefs private.nightlife_notification_preferences; fields text[]; v_venues text[]; v_token text; v_session uuid; v_available boolean;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 perform private.consume_usage('nightlife_notifications',30,600);
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>2048 then raise exception 'Invalid payload' using errcode='22023'; end if;
 fields:=case p_action when 'preferences' then array[]::text[] when 'owner_status' then array[]::text[] when 'unregister' then array[]::text[] when 'save' then array['enabled','venues','age_confirmed'] when 'register' then array['token','platform'] else null end;
 if fields is null or exists(select 1 from jsonb_object_keys(p_payload) k where not(k=any(fields))) then raise exception 'Unexpected request' using errcode='22023'; end if;
 v_session:=(auth.jwt()->>'session_id')::uuid;
 select enabled into v_available from private.nightlife_push_settings;
 if p_action='owner_status' then
  if not private.is_app_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
  return (select jsonb_build_object('available',enabled,'attempts_today',case when day=(now() at time zone 'UTC')::date then attempts_today else 0 end,'daily_cap',5000) from private.nightlife_push_settings);
 end if;
 if p_action='save' then
  if jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' or jsonb_typeof(p_payload->'venues') is distinct from 'array' or jsonb_array_length(p_payload->'venues')>4 or jsonb_typeof(p_payload->'age_confirmed') is distinct from 'boolean' then raise exception 'Invalid preferences' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'venues') v where jsonb_typeof(v)<>'string') then raise exception 'Choose listed venues' using errcode='22023'; end if;
  select coalesce(array_agg(distinct v),'{}') into v_venues from jsonb_array_elements_text(p_payload->'venues') v;
  if not(v_venues <@ array['rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo']::text[]) then raise exception 'Choose listed venues' using errcode='22023'; end if;
  if (p_payload->>'enabled')::boolean and (not v_available or p_payload->>'age_confirmed'<>'true' or cardinality(v_venues)=0) then raise exception 'Alerts require availability, a venue and age confirmation'; end if;
  insert into private.nightlife_notification_preferences(user_id,enabled,venues,age_19_confirmed)
  values(auth.uid(),(p_payload->>'enabled')::boolean,v_venues,(p_payload->>'age_confirmed')::boolean)
  on conflict(user_id) do update set enabled=excluded.enabled,venues=excluded.venues,age_19_confirmed=excluded.age_19_confirmed,updated_at=clock_timestamp();
  delete from private.nightlife_push_deliveries d using private.nightlife_push_devices t where d.token=t.token and t.user_id=auth.uid() and d.status='pending';
  if p_payload->>'enabled'='false' then delete from private.nightlife_push_devices where user_id=auth.uid(); end if;
 elsif p_action='register' then
  if not v_available or not exists(select 1 from private.nightlife_notification_preferences where user_id=auth.uid() and enabled and age_19_confirmed and cardinality(venues)>0) then raise exception 'Enable venue alerts first'; end if;
  v_token:=p_payload->>'token';
  if jsonb_typeof(p_payload->'token') is distinct from 'string' or v_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$' or p_payload->>'platform' is null or p_payload->>'platform' not in ('ios','android') then raise exception 'Invalid device' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('push-devices'),pg_catalog.hashtext(auth.uid()::text));
  if exists(select 1 from private.nightlife_push_devices where token=v_token and user_id<>auth.uid()) then raise exception 'Device is linked to another account' using errcode='42501'; end if;
  if (select count(*) from private.nightlife_push_devices where user_id=auth.uid() and token<>v_token)>=5 then raise exception 'Device limit reached'; end if;
  delete from private.nightlife_push_devices where user_id=auth.uid() and session_id=v_session and token<>v_token;
  insert into private.nightlife_push_devices(token,user_id,session_id,platform) values(v_token,auth.uid(),v_session,p_payload->>'platform')
   on conflict(token) do update set session_id=excluded.session_id,last_seen_at=now();
 elsif p_action='unregister' then
  delete from private.nightlife_push_devices where user_id=auth.uid() and session_id=v_session;
 end if;
 select * into prefs from private.nightlife_notification_preferences where user_id=auth.uid();
 return jsonb_build_object('enabled',coalesce(prefs.enabled,false),'venues',coalesce(to_jsonb(prefs.venues),'[]'),'available',v_available,
 'registered',exists(select 1 from private.nightlife_push_devices where user_id=auth.uid() and session_id=v_session));
end; $$;
revoke all on function private.nightlife_notifications(text,jsonb) from public,anon;
grant execute on function private.nightlife_notifications(text,jsonb) to authenticated;
create function public.nightlife_notifications(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select private.nightlife_notifications(p_action,p_payload); $$;
revoke all on function public.nightlife_notifications(text,jsonb) from public,anon;
grant execute on function public.nightlife_notifications(text,jsonb) to authenticated;

create function private.enqueue_nightlife_push() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if new.moderation_status<>'approved' or new.posted_at<now()-interval '24 hours' or (tg_op='UPDATE' and old.moderation_status='approved') then return new; end if;
 if not exists(select 1 from private.nightlife_push_settings where enabled) then return new; end if;
 insert into private.nightlife_push_deliveries(post_id,token)
 select new.id,d.token from private.nightlife_push_devices d join private.nightlife_notification_preferences p on p.user_id=d.user_id
 where p.enabled and p.age_19_confirmed and new.source_username=any(p.venues) and new.posted_at>=p.updated_at
  and d.last_seen_at>now()-interval '60 days'
 order by d.created_at limit 5000 on conflict(post_id,token) do nothing;
 return new;
end; $$;
revoke all on function private.enqueue_nightlife_push() from public,anon,authenticated;
create trigger enqueue_nightlife_push after insert or update on public.instagram_feed_posts for each row execute function private.enqueue_nightlife_push();

-- Mark send attempts before the network call: ambiguous timeouts aren't resent.
create function private.claim_nightlife_push(p_secret text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare settings private.nightlife_push_settings; item record; messages jsonb:='[]'; receipts jsonb; total integer:=0;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server access required' using errcode='42501'; end if;
 select * into settings from private.nightlife_push_settings for update;
 if p_secret is null or char_length(p_secret)<>64 or encode(extensions.digest(p_secret,'sha256'),'hex')<>settings.token_hash then raise exception 'Unauthorized' using errcode='42501'; end if;
 if not settings.enabled then return '{"messages":[],"receipts":[]}'; end if;
 if settings.day<>(now() at time zone 'UTC')::date then settings.attempts_today:=0; update private.nightlife_push_settings set day=(now() at time zone 'UTC')::date,attempts_today=0; end if;
 update private.nightlife_push_deliveries set status='accepted' where status='checking' and checked_at<now()-interval '5 minutes';
 with candidates as (select id from private.nightlife_push_deliveries where status='accepted' and attempted_at<now()-interval '15 minutes' and coalesce(checked_at,attempted_at)<now()-interval '2 minutes' and receipt_checks<3 order by attempted_at limit 50 for update skip locked),
 claimed as (update private.nightlife_push_deliveries set status='checking',checked_at=now(),receipt_checks=receipt_checks+1 where id in(select id from candidates) returning id,ticket_id)
 select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into receipts from claimed;
 for item in
  select d.id,d.token,d.post_id,f.source_username from private.nightlife_push_deliveries d
  join public.instagram_feed_posts f on f.id=d.post_id
  join private.nightlife_push_devices t on t.token=d.token
  join private.nightlife_notification_preferences p on p.user_id=t.user_id
  where d.status='pending' and d.created_at>now()-interval '24 hours' and f.moderation_status='approved'
   and p.enabled and p.age_19_confirmed and f.source_username=any(p.venues) and f.posted_at>=p.updated_at
   and t.last_seen_at>now()-interval '60 days'
  order by d.created_at,d.id limit least(50,greatest(0,5000-settings.attempts_today)) for update of d skip locked
 loop
  if (select count(*) from private.nightlife_push_deliveries where token=item.token and attempted_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=6 then continue; end if;
  update private.nightlife_push_deliveries set status='sending',attempted_at=now() where id=item.id;
  messages:=messages||jsonb_build_array(jsonb_build_object('id',item.id,'token',item.token,'post_id',item.post_id,'source',item.source_username)); total:=total+1;
 end loop;
 update private.nightlife_push_settings set attempts_today=attempts_today+total;
 return jsonb_build_object('messages',messages,'receipts',receipts);
end; $$;
revoke all on function private.claim_nightlife_push(text) from public,anon,authenticated;
grant execute on function private.claim_nightlife_push(text) to service_role;

create function private.finish_nightlife_push(p_secret text,p_results jsonb) returns void
language plpgsql security definer set search_path='' as $$ declare r jsonb; delivery private.nightlife_push_deliveries; begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or p_secret is null or char_length(p_secret)<>64 or not exists(select 1 from private.nightlife_push_settings where token_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then raise exception 'Unauthorized' using errcode='42501'; end if;
 if jsonb_typeof(p_results) is distinct from 'array' or jsonb_array_length(p_results)>100 or octet_length(p_results::text)>65536 then raise exception 'Invalid result'; end if;
 for r in select * from jsonb_array_elements(p_results) loop
  select * into delivery from private.nightlife_push_deliveries where id=(r->>'id')::uuid for update;
  if not found or delivery.status not in ('sending','checking') then continue; end if;
  if r->>'error'='DeviceNotRegistered' then delete from private.nightlife_push_devices where token=delivery.token;
  elsif delivery.status='sending' then
   update private.nightlife_push_deliveries set status=case when r->>'ticket_id' is not null then 'accepted' else 'failed' end,ticket_id=(r->>'ticket_id')::uuid where id=delivery.id;
  else update private.nightlife_push_deliveries set status=case when r->>'status'='ok' then 'delivered' when r->>'status'='missing' and receipt_checks<3 then 'accepted' else 'failed' end where id=delivery.id;
  end if;
 end loop;
end; $$;
revoke all on function private.finish_nightlife_push(text,jsonb) from public,anon,authenticated;
grant execute on function private.finish_nightlife_push(text,jsonb) to service_role;

-- Preserve the current API guard and privacy implementation, extending only the
-- allowlist and account export. No push token is included in an exported file.
do $$ declare body text; begin
 select pg_get_functiondef('public.check_api_request()'::regprocedure) into body;
 if position('rpc/claim_account_deletion' in body)=0 then raise exception 'Review API guard before extending it'; end if;
 execute replace(body,'''rpc/claim_account_deletion''','''rpc/claim_account_deletion'',''rpc/nightlife_notifications''');
 select pg_get_functiondef('private.account_privacy(text,jsonb)'::regprocedure) into body;
 body:=replace(body,'''2026-10-21''','''2026-11-03''');
 body:=replace(body,'''exported_at'',now(),','''exported_at'',now(),''notifications'',jsonb_build_object(''preferences'',(select to_jsonb(n)-''user_id'' from private.nightlife_notification_preferences n where user_id=v_user),''devices'',coalesce((select jsonb_agg(jsonb_build_object(''platform'',platform,''created_at'',created_at,''last_seen_at'',last_seen_at)) from private.nightlife_push_devices where user_id=v_user),''[]''::jsonb)),');
 execute body;
end; $$;
-- Scheduled delivery remains paused until the signed push-capable build is ready.
select cron.schedule('dispatch-nightlife-notifications','*/5 * * * *',$job$
 select net.http_post(url:='https://ekptnmermhvtrdqpjwwa.supabase.co/functions/v1/dispatch-nightlife-notifications',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='nightlife_push_dispatch_token')),body:='{}'::jsonb,timeout_milliseconds:=30000);
$job$);
select cron.alter_job((select jobid from cron.job where jobname='dispatch-nightlife-notifications'),active:=false);
select cron.schedule('expire-nightlife-notifications','20 6 * * *',$job$
 delete from private.nightlife_push_devices where last_seen_at<now()-interval '60 days';
 delete from private.nightlife_push_deliveries where created_at<now()-interval '7 days';
$job$);
notify pgrst,'reload schema';

create function public.claim_nightlife_push(p_secret text) returns jsonb language sql security invoker set search_path='' as $$ select private.claim_nightlife_push(p_secret); $$;
revoke all on function public.claim_nightlife_push(text) from public,anon,authenticated;
grant execute on function public.claim_nightlife_push(text) to service_role;

create function public.finish_nightlife_push(p_secret text,p_results jsonb) returns void language sql security invoker set search_path='' as $$ select private.finish_nightlife_push(p_secret,p_results); $$;
revoke all on function public.finish_nightlife_push(text,jsonb) from public,anon,authenticated;
grant execute on function public.finish_nightlife_push(text,jsonb) to service_role;
