-- Transaction-only synthetic users and storage metadata; nothing is committed.
begin;
create function pg_temp.assert_true(p boolean,label text) returns void language plpgsql as $$begin if p is distinct from true then raise exception 'FAILED: %',label;end if;end;$$;
create function pg_temp.denied(command text) returns boolean language plpgsql as $$begin execute command;return false;exception when insufficient_privilege then return true;end;$$;
grant execute on function pg_temp.assert_true(boolean,text) to anon,authenticated,service_role;
grant execute on function pg_temp.denied(text) to anon,authenticated,service_role;
insert into auth.users(id,email,email_confirmed_at)values
 ('00000000-0000-4000-a100-000000000001','tutor-a@example.invalid',now()),
 ('00000000-0000-4000-a100-000000000002','tutor-b@example.invalid',now()),
 ('00000000-0000-4000-a100-000000000003','test-owner@example.invalid',now());
insert into auth.sessions(id,user_id)values
 ('00000000-0000-4000-b100-000000000001','00000000-0000-4000-a100-000000000001'),
 ('00000000-0000-4000-b100-000000000002','00000000-0000-4000-a100-000000000002'),
 ('00000000-0000-4000-b100-000000000003','00000000-0000-4000-a100-000000000003');
insert into private.app_owners values('00000000-0000-4000-a100-000000000003');
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email)values
 ('00000000-0000-4000-a100-000000000001','Synthetic Tutor','Audit',true,'tutor-a@example.invalid');
select private.review_profile('00000000-0000-4000-a100-000000000001','approved');
insert into private.account_consents(user_id,terms_version,privacy_version,age_16_confirmed) select id,'2026-10-17','2026-10-17',true from auth.users where email like '%@example.invalid' on conflict do nothing;
set local role anon;
select pg_temp.assert_true(pg_temp.denied($sql$select public.owner_portal('applications')$sql$),'guest cannot read owner queue');
select pg_temp.assert_true(pg_temp.denied($sql$select public.tutor_portal('directory')$sql$),'guest cannot read tutor contact details');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a100-000000000001","session_id":"00000000-0000-4000-b100-000000000001","user_metadata":{"admin":true}}',true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($sql$select public.owner_portal('reports')$sql$),'forged user metadata does not authorize owner');
select pg_temp.assert_true(pg_temp.denied($sql$select * from private.tutor_applications$sql$),'private application table is inaccessible');
select pg_temp.assert_true(pg_temp.denied($sql$select public.tutor_storage_cleanup()$sql$),'user cannot enumerate files for deletion');
select set_config('test.application',(public.tutor_portal('create','{"display_name":"Synthetic Tutor","course_code":"cp 104","course_name":"Intro Programming","term_completed":"Fall 2025","approach":"I explain programming using worked practice examples and questions.","experience":"Peer mentoring","availability":"Weekday evenings online","hourly_rate":20,"consent":true}'::jsonb)->>'id'),true);
select pg_temp.assert_true(jsonb_array_length(public.tutor_portal('mine'))=1,'applicant can read own draft');
select pg_temp.assert_true(jsonb_array_length(public.tutor_portal('directory'))=0,'draft never appears in directory');
do $$begin
 begin perform public.tutor_portal('submit',jsonb_build_object('id',current_setting('test.application')));raise exception 'FAILED: missing transcript accepted';
 exception when raise_exception then if sqlerrm like 'FAILED:%' then raise;end if;end;
end;$$;
select pg_temp.assert_true(private.transcript_access('00000000-0000-4000-a100-000000000001/'||current_setting('test.application')||'/transcript.jpg','insert'),'reserved own path accepts upload');
select pg_temp.assert_true(not private.transcript_access('00000000-0000-4000-a100-000000000002/anything/transcript.jpg','insert'),'arbitrary path denied');
reset role;
insert into storage.objects(bucket_id,name,metadata)values('tutor-transcripts','00000000-0000-4000-a100-000000000001/'||current_setting('test.application')||'/transcript.jpg','{"mimetype":"image/jpeg","size":100}');
set local role authenticated;
select public.tutor_portal('submit',jsonb_build_object('id',current_setting('test.application')));
select pg_temp.assert_true(not private.transcript_access('00000000-0000-4000-a100-000000000001/'||current_setting('test.application')||'/transcript.jpg','insert'),'submitted transcript cannot be overwritten');
select pg_temp.assert_true(pg_temp.denied($sql$select public.owner_portal('review_application',jsonb_build_object('id',current_setting('test.application'),'decision','approved'))$sql$),'self approval denied');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a100-000000000002","session_id":"00000000-0000-4000-b100-000000000002"}',true);
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.tutor_portal('mine'))=0,'other student cannot read application');
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='tutor-transcripts'),'other student cannot read transcript metadata');
select pg_temp.assert_true(pg_temp.denied($sql$select public.tutor_portal('withdraw',jsonb_build_object('id',current_setting('test.application')))$sql$),'other student cannot withdraw application');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a100-000000000003","session_id":"00000000-0000-4000-b100-000000000003"}',true);
set local role authenticated;
select pg_temp.assert_true(public.owner_portal('access')='true'::jsonb,'allowlisted owner authorized');
select pg_temp.assert_true(jsonb_array_length(public.owner_portal('applications'))>=1,'owner sees queue');
select pg_temp.assert_true((select count(*)>=1 from storage.objects where bucket_id='tutor-transcripts'),'owner reads transcript metadata');
select public.owner_portal('review_application',jsonb_build_object('id',current_setting('test.application'),'decision','approved','expected_status','pending'));
select pg_temp.assert_true(exists(select 1 from jsonb_array_elements(public.tutor_portal('directory'))a where a->>'id'=current_setting('test.application')),'approved listing appears');
select pg_temp.assert_true(not exists(select 1 from jsonb_array_elements(public.tutor_portal('directory'))a where a?'transcript_path' or a?'term_completed' or a?'experience' or a?'user_id'),'directory has only consented fields');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a100-000000000002","session_id":"00000000-0000-4000-b100-000000000002"}',true);
set local role authenticated;
select public.report_content('tutor',current_setting('test.application'),'misleading');
select public.report_content('profile','00000000-0000-4000-a100-000000000001','privacy');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a100-000000000003","session_id":"00000000-0000-4000-b100-000000000003"}',true);
set local role authenticated;
do $$declare r jsonb;begin
 for r in select value from jsonb_array_elements(public.owner_portal('reports')) where value->>'profile_id'='00000000-0000-4000-a100-000000000001' or value->>'tutor_application_id'=current_setting('test.application') loop
  perform public.owner_portal('review_report',jsonb_build_object('id',r->>'id','decision','remove'));
 end loop;
end;$$;
reset role;
select pg_temp.assert_true((select moderation_status='suspended' from public.student_profiles where id='00000000-0000-4000-a100-000000000001'),'owner report action suspends profile through the review trigger');
select pg_temp.assert_true((select status='rejected' from private.tutor_applications where id=current_setting('test.application')::uuid),'reported tutor listing removed');
select pg_temp.assert_true(not (select public from storage.buckets where id='tutor-transcripts'),'transcript bucket is private');
delete from auth.sessions where id='00000000-0000-4000-b100-000000000003';
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($sql$select public.owner_portal('applications')$sql$),'revoked owner session is rejected');
reset role;
select 'Tutoring and owner RLS checks passed; all fixtures rolled back' as result;
rollback;
