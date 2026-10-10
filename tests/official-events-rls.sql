-- Test the actual writer/reader and access grants without committing synthetic data.
begin;
set local role service_role;
do $$
declare
  snapshot jsonb := '[{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","title":"Test event","category":"Social","starts_at":"2026-10-11T14:00:00Z","ends_at":"2026-10-11T15:00:00Z","all_day":false,"place":"","cost":"","description":"","host":"","campus":["Waterloo"],"source_url":"https://events.wlu.ca/2026/oct/test.html"}]';
  observed timestamptz := clock_timestamp();
begin
  if not public.replace_official_events(snapshot,'test',observed) then raise exception 'Fresh snapshot was rejected'; end if;
  if jsonb_array_length(public.official_event_feed()->'events') <> 1 then raise exception 'Reader snapshot mismatch'; end if;
  if public.replace_official_events('[]','older',observed - interval '1 second') then raise exception 'Older import overwrote newer import'; end if;
  begin
    perform public.replace_official_events(snapshot || snapshot,'invalid duplicate',observed + interval '1 second');
    raise exception 'Duplicate snapshot was accepted';
  exception when unique_violation then null;
  end;
  if (public.official_event_feed()->'events'->0->>'title') <> 'Test event' or jsonb_array_length(public.official_event_feed()->'events') <> 1 then raise exception 'Failed import changed old data'; end if;
  if not public.replace_official_events('[]','removed',observed + interval '2 seconds') then raise exception 'Valid empty snapshot was rejected'; end if;
  if jsonb_array_length(public.official_event_feed()->'events') <> 0 then raise exception 'Removed events were retained'; end if;
end $$;
set local role anon;
do $$
begin
  perform public.official_event_feed();
  begin
    perform public.replace_official_events('[]','unauthorized',now());
    raise exception 'Anonymous user can trigger replacement';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.official_events where id is not null;
    raise exception 'Anonymous user can delete listings';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role authenticated;
do $$
begin
  perform public.official_event_feed();
  begin
    perform public.replace_official_events('[]','unauthorized',now());
    raise exception 'Signed-in user can trigger replacement';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
