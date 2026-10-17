-- Synthetic users only; every record and counter below is rolled back.
begin;
create function pg_temp.assert_true(p boolean,label text) returns void language plpgsql as $$begin if p is distinct from true then raise exception 'FAILED: %',label;end if;end;$$;
create function pg_temp.denied(command text, expected text default null) returns boolean language plpgsql as $$begin execute command;return false;exception when others then if expected is null or sqlerrm ilike '%'||expected||'%' then return true;else raise;end if;end;$$;
insert into auth.users(id,email,email_confirmed_at)values
 ('00000000-0000-4000-a700-000000000001','safety-a@example.invalid',now()),
 ('00000000-0000-4000-a700-000000000002','safety-b@example.invalid',now());
insert into auth.sessions(id,user_id)values
 ('00000000-0000-4000-b700-000000000001','00000000-0000-4000-a700-000000000001'),
 ('00000000-0000-4000-b700-000000000002','00000000-0000-4000-a700-000000000002');
set local role anon;
select pg_temp.assert_true(pg_temp.denied($q$select public.account_privacy('export')$q$),'guest cannot export');
select pg_temp.assert_true(pg_temp.denied($q$select public.claim_sync_budget('instagram')$q$),'guest cannot reserve paid job');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a700-000000000001","session_id":"00000000-0000-4000-b700-000000000001","email":"safety-a@example.invalid","user_metadata":{"admin":true}}',true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$select public.security_usage()$q$,'Owner'),'forged metadata cannot inspect owner usage');
select pg_temp.assert_true(pg_temp.denied($q$select * from private.usage_buckets$q$),'private counters unavailable');
select pg_temp.assert_true(pg_temp.denied($q$select public.account_privacy('accept','{"terms_version":"2026-10-17","age_16_confirmed":false}')$q$,'Confirm'),'underage/unconfirmed rejected');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.student_profiles(id,display_name,program)values(auth.uid(),'Test A','Audit')$q$,'terms'),'profile cannot bypass account consent');
select public.account_privacy('accept','{"terms_version":"2026-10-17","age_16_confirmed":true}');
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email)values(auth.uid(),'Test A','Audit',true,'safety-a@example.invalid');
select pg_temp.assert_true((public.account_privacy('summary')->'profile'->>'discoverable')::boolean,'own opted-in profile visible');
select public.account_privacy('hide_profile');
select pg_temp.assert_true(not (public.account_privacy('summary')->'profile'->>'discoverable')::boolean,'sharing withdrawal works');
select pg_temp.assert_true(public.account_privacy('export')->'account'->>'email'='safety-a@example.invalid','export scoped to authenticated user');
select public.account_privacy('export'); select public.account_privacy('export');
select pg_temp.assert_true(pg_temp.denied($q$select public.account_privacy('export')$q$,'limit'),'fourth export is rate limited');
reset role;
select private.consume_usage('test-limit',2,600);
select private.consume_usage('test-limit',2,600);
select pg_temp.assert_true(pg_temp.denied($q$select private.consume_usage('test-limit',2,600)$q$,'limit'),'atomic limit boundary enforced');
-- A line report upsert must count once, not once for INSERT and again for UPDATE.
insert into private.venue_line_reports(user_id,venue_id,night_date,wait_minutes)values(auth.uid(),'pub',private.line_night_date(now()),5);
select pg_temp.assert_true(pg_temp.denied($q$insert into private.venue_line_reports(user_id,venue_id,night_date,wait_minutes)values(auth.uid(),'pub',private.line_night_date(now()),15) on conflict(user_id,venue_id,night_date) do update set wait_minutes=excluded.wait_minutes$q$,'limit'),'repeat report throttled');
-- Reserved transcript access is denied when the global bucket is full.
select set_config('test.transcript_path',(public.tutor_portal('create','{"display_name":"Test A","course_code":"CP104","course_name":"Intro programming","term_completed":"Fall 2025","approach":"I explain concepts with practice problems and independent thinking.","experience":"","availability":"Online weekends","hourly_rate":20,"consent":true}'::jsonb)->>'transcript_path'),true);
select pg_temp.assert_true(private.transcript_access(current_setting('test.transcript_path'),'insert'),'own reserved upload allowed');
insert into storage.objects(bucket_id,name,metadata) values('tutor-transcripts','00000000-0000-4000-a700-000000000001/00000000-0000-4000-c700-000000000001/transcript.jpg','{"mimetype":"image/jpeg","size":1073741824}');
select pg_temp.assert_true(pg_temp.denied($q$select private.transcript_access(current_setting('test.transcript_path'),'insert')$q$,'capacity'),'global transcript cap enforced');
select set_config('request.jwt.claims','{"role":"authenticated","email":"safety-b@example.invalid","sub":"00000000-0000-4000-a700-000000000002","session_id":"00000000-0000-4000-b700-000000000002"}',true);
set local role authenticated;
select pg_temp.assert_true(public.account_privacy('export')->'profile'='null'::jsonb,'second user cannot export first profile');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
-- Test the paid quota without triggering any real provider run.
delete from private.job_budgets where job='instagram' and day=(now() at time zone 'UTC')::date;
select pg_temp.assert_true(public.claim_sync_budget('instagram'),'first paid attempt reserves budget');
select pg_temp.assert_true(not public.claim_sync_budget('instagram'),'parallel/repeated paid attempt denied');
update private.job_budgets set attempts=6,last_started=now()-interval '2 hours' where job='instagram' and day=(now() at time zone 'UTC')::date;
select pg_temp.assert_true(not public.claim_sync_budget('instagram'),'daily paid budget enforced');
select 'Safety and privacy assertions passed; fixtures rolled back' result;
rollback;
