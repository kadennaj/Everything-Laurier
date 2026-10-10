begin;
create function pg_temp.assert_true(p boolean,label text) returns void language plpgsql as $$
begin if p is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-a000-000000000011','auto-a@example.invalid',now()),
 ('00000000-0000-4000-a000-000000000012','auto-b@example.invalid',now()),
 ('00000000-0000-4000-a000-000000000013','unverified@example.invalid',null),
 ('00000000-0000-4000-a000-000000000014','private@example.invalid',now());
insert into auth.sessions(id,user_id) values
 ('00000000-0000-4000-b000-000000000011','00000000-0000-4000-a000-000000000011');
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email) values
 ('00000000-0000-4000-a000-000000000012','Auto B','Test Program',true,'auto-b@example.invalid'),
 ('00000000-0000-4000-a000-000000000013','Unverified','Test Program',true,'unverified@example.invalid'),
 ('00000000-0000-4000-a000-000000000014','Private','Test Program',false,null);
select pg_temp.assert_true((select moderation_status='pending' from public.student_profiles where id='00000000-0000-4000-a000-000000000013'),'unverified profiles do not publish');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000011","role":"authenticated","email":"auto-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000011"}',true);
set local role authenticated;
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email)
 values('00000000-0000-4000-a000-000000000011','Auto A','Test Program',true,'auto-a@example.invalid');
select pg_temp.assert_true((select moderation_status='approved' from public.student_profiles where id='00000000-0000-4000-a000-000000000011'),'new opted-in verified profile publishes automatically');
select pg_temp.assert_true((select count(*)=2 from public.student_profiles where id::text like '00000000-0000-4000-a000-00000000001%'),'only own and verified shared peers visible');
update public.student_profiles set bio='Updated bio' where id='00000000-0000-4000-a000-000000000011';
select pg_temp.assert_true((select moderation_status='approved' from public.student_profiles where id='00000000-0000-4000-a000-000000000011'),'edits stay automatically published');
update public.student_profiles set is_discoverable=false,contact_email=null where id='00000000-0000-4000-a000-000000000011';
select pg_temp.assert_true((select not is_discoverable and contact_email is null from public.student_profiles where id='00000000-0000-4000-a000-000000000011'),'disabling discovery keeps contact private');
update public.student_profiles set is_discoverable=true,contact_email='auto-a@example.invalid' where id='00000000-0000-4000-a000-000000000011';
select pg_temp.assert_true((select moderation_status='approved' from public.student_profiles where id='00000000-0000-4000-a000-000000000011'),'enabling sharing publishes automatically');
do $$ begin
 begin update public.student_profiles set moderation_status='approved' where id='00000000-0000-4000-a000-000000000011'; raise exception 'client status write allowed'; exception when insufficient_privilege then null; end;
 begin update public.student_profiles set contact_email='other@example.invalid' where id='00000000-0000-4000-a000-000000000011'; raise exception 'unverified contact accepted'; exception when insufficient_privilege then null; end;
end $$;
select public.report_content('profile','00000000-0000-4000-a000-000000000012','spam');
select public.change_profile_block('00000000-0000-4000-a000-000000000012',true);
select pg_temp.assert_true((select count(*)=0 from public.student_profiles where id='00000000-0000-4000-a000-000000000012'),'published peer still blockable');
select public.change_profile_block('00000000-0000-4000-a000-000000000012',false);
reset role;
select set_config('request.jwt.claims','{}',true);
select private.review_profile('00000000-0000-4000-a000-000000000011','rejected');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000011","role":"authenticated","email":"auto-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000011"}',true);
set local role authenticated;
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email)
 values('00000000-0000-4000-a000-000000000011','Edited Auto A','Test Program',true,'auto-a@example.invalid')
 on conflict(id) do update set display_name=excluded.display_name;
select pg_temp.assert_true((select moderation_status='rejected' from public.student_profiles where id='00000000-0000-4000-a000-000000000011'),'upserts cannot republish operator removals');
update public.student_profiles set bio='Another edit' where id='00000000-0000-4000-a000-000000000011';
select pg_temp.assert_true((select moderation_status='rejected' from public.student_profiles where id='00000000-0000-4000-a000-000000000011'),'edits cannot republish operator removals');
reset role;
select set_config('request.jwt.claims','{}',true);
select private.review_profile('00000000-0000-4000-a000-000000000011','suspended');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000011","role":"authenticated","email":"auto-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000011"}',true);
set local role authenticated;
do $$ begin
 begin update public.student_profiles set bio='Restricted edit' where id='00000000-0000-4000-a000-000000000011'; raise exception 'suspended edit allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Automatic publication and removal safeguards passed; synthetic data rolled back' as result;
