-- Exercise the request guard and real writer as a synthetic student. Roll back
-- the account, report, aggregate and counters; no public test estimate survives.
-- Run during line-reporting hours (6 PM–5 AM America/Toronto).
begin;
select set_config('test.line_user',gen_random_uuid()::text,true),
       set_config('test.line_session',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at)
values(current_setting('test.line_user')::uuid,'line-endpoint@example.invalid',now());
insert into auth.sessions(id,user_id)
values(current_setting('test.line_session')::uuid,current_setting('test.line_user')::uuid);
select set_config('request.method','POST',true),
       set_config('request.path','/rpc/submit_venue_line_report',true),
       set_config('request.headers','{}',true),
       set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  begin
    perform public.check_api_request();
    raise exception 'Guest report was allowed';
  exception when insufficient_privilege then
    if sqlerrm <> 'Sign in required' then raise; end if;
  end;
end; $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated',
  'sub',current_setting('test.line_user'),'session_id',current_setting('test.line_session'))::text,true);
set local role authenticated;
select public.check_api_request();
do $$ begin
  begin
    perform public.submit_venue_line_report('pub',5::smallint);
    raise exception 'Report without consent was allowed';
  exception when insufficient_privilege then
    if sqlerrm not ilike '%terms%' then raise; end if;
  end;
end; $$;
reset role;
insert into private.account_consents(user_id,terms_version,privacy_version,age_16_confirmed)
values(current_setting('test.line_user')::uuid,'2026-10-17','2026-11-03',true);
set local role authenticated;
select public.check_api_request();
select public.submit_venue_line_report('pub',5::smallint);
do $$ begin
  begin
    perform public.check_api_request();
    perform public.submit_venue_line_report('pub',15::smallint);
    raise exception 'Repeated report was allowed';
  exception when raise_exception then
    if sqlerrm not ilike '%limit%' then raise; end if;
  end;
  perform set_config('request.path','/venue_line_status',true);
  begin
    perform public.check_api_request();
    raise exception 'Direct aggregate write was allowed';
  exception when insufficient_privilege then
    if sqlerrm <> 'Endpoint is not writable' then raise; end if;
  end;
  perform set_config('request.path','/rpc/submit_venue_line_report',true);
end; $$;
reset role;
do $$ begin
  if not exists(select 1 from private.venue_line_reports where user_id=auth.uid()
    and venue_id='pub' and night_date=private.line_night_date(now()) and wait_minutes=5)
    then raise exception 'Report was not saved or throttled report changed it'; end if;
  if not exists(select 1 from public.venue_line_status where venue_id='pub'
    and night_date=private.line_night_date(now()) and report_count>0 and last_reported_at=now())
    then raise exception 'Aggregate was not refreshed'; end if;
end; $$;
-- Simulate the daily boundary using only the synthetic student's counters.
delete from private.usage_buckets where user_id=auth.uid() and action in ('line','line_daily');
insert into private.usage_buckets(user_id,action,window_start,requests)
values(auth.uid(),'line_daily',to_timestamp(floor(extract(epoch from now())/86400)*86400),30);
set local role authenticated;
do $$ begin
  begin
    perform public.check_api_request();
    perform public.submit_venue_line_report('pub',30::smallint);
    raise exception 'Daily report limit was bypassed';
  exception when raise_exception then
    if sqlerrm not ilike '%limit%' then raise; end if;
  end;
end; $$;
reset role;
delete from auth.sessions where id=current_setting('test.line_session')::uuid;
set local role authenticated;
do $$ begin
  begin
    perform public.check_api_request();
    raise exception 'Revoked session was allowed';
  exception when insufficient_privilege then
    if sqlerrm not ilike '%Sign in%' then raise; end if;
  end;
end; $$;
reset role;
select 'Line endpoint, save, aggregate, consent, session and quota assertions passed; fixtures rolled back' as result;
rollback;
