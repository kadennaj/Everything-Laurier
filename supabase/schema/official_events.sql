create table public.official_events (
  id text primary key check (id ~ '^[a-f0-9]{32}(_[0-9]{4}-[0-9]{2}-[0-9]{2})?$'),
  title text not null check (length(title) between 1 and 20000),
  category text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  all_day boolean not null, place text not null, cost text not null,
  description text not null, host text not null, campus text[] not null,
  source_url text not null check (source_url ~ '^https://events\.wlu\.ca/(recurring|[0-9]{4}/[a-z]+)/[a-z0-9_-]+\.html$'),
  check (ends_at >= starts_at), check (campus && array['Waterloo','Online']::text[])
);
create index official_events_start on public.official_events (starts_at);
create table public.official_event_sync (
  singleton boolean primary key default true check (singleton),
  synced_at timestamptz not null, observed_at timestamptz not null, source_published text not null
);
alter table public.official_events enable row level security;
alter table public.official_event_sync enable row level security;
revoke all on public.official_events, public.official_event_sync from anon, authenticated;
grant select on public.official_events, public.official_event_sync to anon, authenticated;
grant all on public.official_events, public.official_event_sync to service_role;
create policy official_events_read on public.official_events for select to anon, authenticated using (true);
create policy official_event_sync_read on public.official_event_sync for select to anon, authenticated using (true);

create or replace function public.replace_official_events(p_events jsonb, p_source_published text, p_observed_at timestamptz)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('official_events_sync'));
  if p_observed_at is null or p_observed_at > now() + interval '1 minute' or p_source_published is null or length(p_source_published) = 0
    or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 5000 then
    raise exception 'Invalid calendar snapshot';
  end if;
  if exists (select 1 from public.official_event_sync where observed_at >= p_observed_at) then return false; end if;
  delete from public.official_events where id is not null;
  insert into public.official_events
    select * from jsonb_to_recordset(p_events) as e(id text,title text,category text,starts_at timestamptz,ends_at timestamptz,
      all_day boolean,place text,cost text,description text,host text,campus text[],source_url text);
  insert into public.official_event_sync(singleton,synced_at,observed_at,source_published)
    values (true,clock_timestamp(),p_observed_at,p_source_published)
    on conflict (singleton) do update set synced_at = excluded.synced_at, observed_at = excluded.observed_at, source_published = excluded.source_published;
  return true;
end;
$$;
revoke all on function public.replace_official_events(jsonb,text,timestamptz) from public, anon, authenticated;
grant execute on function public.replace_official_events(jsonb,text,timestamptz) to service_role;

-- One statement reads events and freshness from the same committed snapshot.
create function public.official_event_feed() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.starts_at,e.id) from public.official_events e), '[]'::jsonb),
    'syncedAt', (select synced_at from public.official_event_sync where singleton),
    'sourcePublished', (select source_published from public.official_event_sync where singleton));
$$;
revoke all on function public.official_event_feed() from public;
grant execute on function public.official_event_feed() to anon, authenticated, service_role;
