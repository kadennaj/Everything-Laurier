-- Apply after student_profiles.sql and venue_line_reports.sql.
-- Auth's hard deletion already cascades to both account-owned tables.
-- This helper reads only the caller's server-issued user/session claims.
create or replace function private.account_session_active()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions s
    where s.user_id = auth.uid()
      and s.id::text = auth.jwt()->>'session_id'
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function private.account_session_active() from public, anon;
grant execute on function private.account_session_active() to authenticated;

create or replace function public.account_session_active()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.account_session_active(); $$;
revoke all on function public.account_session_active() from public, anon;
grant execute on function public.account_session_active() to authenticated;

-- Restrictive policy is ANDed with the existing ownership/discovery policies.
drop policy if exists "Profile access requires a live session" on public.student_profiles;
create policy "Profile access requires a live session"
on public.student_profiles as restrictive for all to authenticated
using ((select private.account_session_active()))
with check ((select private.account_session_active()));

create or replace function public.submit_venue_line_report(p_venue_id text, p_wait_minutes smallint)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.account_session_active() then
    raise exception 'Sign in again to report the line' using errcode = '42501';
  end if;
  perform private.record_venue_line_report(p_venue_id, p_wait_minutes);
end;
$$;

-- Cascading deletes must remove a deleted student's contribution immediately.
create or replace function private.refresh_after_line_report_delete()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.venue_id in ('pub', 'prohibition', 'rare', 'kentucky') then
    perform private.refresh_venue_line_status(old.venue_id);
  end if;
  return old;
end;
$$;
revoke all on function private.refresh_after_line_report_delete() from public, anon, authenticated;
drop trigger if exists refresh_deleted_line_report on private.venue_line_reports;
create trigger refresh_deleted_line_report
after delete on private.venue_line_reports
for each row execute function private.refresh_after_line_report_delete();

-- Guard the private writer as well as the exposed RPC.
create or replace function private.record_venue_line_report(p_venue_id text, p_wait_minutes smallint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_local_time time := (now() at time zone 'America/Toronto')::time;
begin
  if v_user_id is null or not private.account_session_active() then
    raise exception 'Sign in to report the line';
  end if;
  if p_venue_id is null or p_venue_id not in ('pub', 'prohibition', 'rare', 'kentucky') then
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
