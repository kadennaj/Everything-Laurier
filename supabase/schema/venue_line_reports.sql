-- Student-reported queue estimates. Raw reports remain outside the Data API;
-- only per-venue aggregates are readable by other students.
create schema if not exists private;

create table private.venue_line_reports (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id text not null check (venue_id in ('phils', 'crown', 'pub', 'wilfs')),
  night_date date not null,
  wait_minutes smallint not null check (wait_minutes in (0, 5, 15, 30, 45)),
  reported_at timestamptz not null default now(),
  primary key (user_id, venue_id, night_date)
);

create index venue_line_reports_recent_idx
  on private.venue_line_reports (venue_id, night_date, reported_at desc);

alter table private.venue_line_reports enable row level security;
revoke all on private.venue_line_reports from anon, authenticated;

create policy "Raw line reports are never client readable"
  on private.venue_line_reports for all to anon, authenticated
  using (false) with check (false);

create table public.venue_line_status (
  venue_id text primary key check (venue_id in ('phils', 'crown', 'pub', 'wilfs')),
  night_date date not null,
  wait_minutes smallint check (wait_minutes in (0, 5, 15, 30, 45)),
  report_count integer not null default 0 check (report_count >= 0),
  last_reported_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint venue_line_status_consistent check (
    (report_count = 0 and wait_minutes is null and last_reported_at is null) or
    (report_count > 0 and wait_minutes is not null and last_reported_at is not null)
  )
);

alter table public.venue_line_status enable row level security;
revoke all on public.venue_line_status from anon, authenticated;
grant select on public.venue_line_status to anon, authenticated;

create policy "Anyone can read anonymous line estimates"
  on public.venue_line_status for select to anon, authenticated using (true);

-- A local evening remains the same night until 6 AM in Waterloo.
create function private.line_night_date(p_at timestamptz)
returns date language sql stable set search_path = ''
as $$
  select ((p_at at time zone 'America/Toronto') - interval '6 hours')::date;
$$;

create function private.refresh_venue_line_status(p_venue_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_night date := private.line_night_date(now());
  v_count integer;
  v_average numeric;
  v_last timestamptz;
  v_wait smallint;
begin
  if p_venue_id not in ('phils', 'crown', 'pub', 'wilfs') then
    raise exception 'Unknown venue';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('venue_line_reports'), pg_catalog.hashtext(p_venue_id));

  select count(*)::integer, avg(wait_minutes), max(reported_at)
  into v_count, v_average, v_last
  from private.venue_line_reports
  where venue_id = p_venue_id
    and night_date = v_night
    and reported_at > now() - interval '90 minutes';

  if v_count > 0 then
    v_wait := case
      when v_average < 2.5 then 0
      when v_average < 10 then 5
      when v_average < 22.5 then 15
      when v_average < 37.5 then 30
      else 45
    end;
  end if;

  insert into public.venue_line_status
    (venue_id, night_date, wait_minutes, report_count, last_reported_at, updated_at)
  values (p_venue_id, v_night, v_wait, v_count, v_last, now())
  on conflict (venue_id) do update set
    night_date = excluded.night_date,
    wait_minutes = excluded.wait_minutes,
    report_count = excluded.report_count,
    last_reported_at = excluded.last_reported_at,
    updated_at = excluded.updated_at
  where (public.venue_line_status.night_date, public.venue_line_status.wait_minutes,
         public.venue_line_status.report_count, public.venue_line_status.last_reported_at)
    is distinct from
        (excluded.night_date, excluded.wait_minutes, excluded.report_count, excluded.last_reported_at);
end;
$$;

create function private.refresh_all_venue_line_status()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_venue_id text;
begin
  foreach v_venue_id in array array['phils', 'crown', 'pub', 'wilfs'] loop
    perform private.refresh_venue_line_status(v_venue_id);
  end loop;
  delete from private.venue_line_reports
  where night_date < private.line_night_date(now()) - 7;
end;
$$;

create function private.record_venue_line_report(p_venue_id text, p_wait_minutes smallint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_local_time time := (now() at time zone 'America/Toronto')::time;
begin
  if v_user_id is null then
    raise exception 'Sign in to report the line';
  end if;
  if p_venue_id is null or p_venue_id not in ('phils', 'crown', 'pub', 'wilfs') then
    raise exception 'Unknown venue';
  end if;
  if p_wait_minutes is null or p_wait_minutes not in (0, 5, 15, 30, 45) then
    raise exception 'Choose a listed wait time';
  end if;
  if not (v_local_time >= time '18:00' or v_local_time < time '05:00') then
    raise exception 'Line reports open at 6 PM Waterloo time';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('venue_line_reports'), pg_catalog.hashtext(p_venue_id));
  insert into private.venue_line_reports (user_id, venue_id, night_date, wait_minutes, reported_at)
  values (v_user_id, p_venue_id, private.line_night_date(now()), p_wait_minutes, now())
  on conflict (user_id, venue_id, night_date) do update set
    wait_minutes = excluded.wait_minutes,
    reported_at = excluded.reported_at;
  perform private.refresh_venue_line_status(p_venue_id);
end;
$$;

-- The exposed RPC runs with the caller's privileges. The validated writer is
-- in a schema that is not exposed through Supabase's Data API.
create function public.submit_venue_line_report(p_venue_id text, p_wait_minutes smallint)
returns void language sql set search_path = ''
as $$
  select private.record_venue_line_report(p_venue_id, p_wait_minutes);
$$;

revoke all on function private.line_night_date(timestamptz) from public;
revoke all on function private.refresh_venue_line_status(text) from public;
revoke all on function private.refresh_all_venue_line_status() from public;
revoke all on function private.record_venue_line_report(text, smallint) from public;
revoke all on function public.submit_venue_line_report(text, smallint) from public;
revoke all on function public.submit_venue_line_report(text, smallint) from anon;
grant usage on schema private to authenticated;
grant execute on function private.record_venue_line_report(text, smallint) to authenticated;
grant execute on function public.submit_venue_line_report(text, smallint) to authenticated;

select private.refresh_all_venue_line_status();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'venue_line_status'
  ) then
    alter publication supabase_realtime add table public.venue_line_status;
  end if;
end;
$$;

select cron.schedule(
  'refresh-venue-line-status',
  '*/5 * * * *',
  $$select private.refresh_all_venue_line_status();$$
);
