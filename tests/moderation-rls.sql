begin;
create function pg_temp.assert_true(p boolean,p_label text) returns void language plpgsql as $$ begin if p is distinct from true then raise exception 'FAILED: %',p_label; end if; end; $$;
-- Synthetic users exist only within this transaction. No emails, accounts or reports persist.
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-a000-000000000001','audit-a@example.invalid',now()),
('00000000-0000-4000-a000-000000000002','audit-b@example.invalid',now());
insert into auth.sessions(id,user_id) values
('00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000001'),
('00000000-0000-4000-b000-000000000002','00000000-0000-4000-a000-000000000002');
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email) values
('00000000-0000-4000-a000-000000000001','Audit A','Test Program',true,'audit-a@example.invalid'),
('00000000-0000-4000-a000-000000000002','Audit B','Test Program',true,'audit-b@example.invalid');
update public.student_profiles set moderation_status='pending' where id='00000000-0000-4000-a000-000000000002';
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at)
values('audit-only-post','rarenightclub','https://www.instagram.com/p/audit-only-post/','Test caption',now());
update public.instagram_feed_posts set moderation_status='pending' where id='audit-only-post';
select pg_temp.assert_true((select moderation_status='pending' from public.instagram_feed_posts where id='audit-only-post'),'operator can hold a post');
insert into private.account_consents(user_id,terms_version,privacy_version,age_16_confirmed) select id,'2026-10-17','2026-10-17',true from auth.users where email like '%@example.invalid' on conflict do nothing;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated","email":"audit-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000001"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=1 from public.student_profiles where id in('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002')),'pending peers hidden, own visible');
select pg_temp.assert_true((select count(*)=0 from public.instagram_feed_posts where id='audit-only-post'),'pending posts hidden');
do $$ begin
 begin update public.student_profiles set moderation_status='approved' where id='00000000-0000-4000-a000-000000000001'; raise exception 'approval unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform private.review_profile('00000000-0000-4000-a000-000000000001','approved'); raise exception 'admin unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.report_content('profile','00000000-0000-4000-a000-000000000002','spam'); raise exception 'private report unexpectedly allowed'; exception when raise_exception then if sqlerrm<>'Profile unavailable' then raise; end if; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select private.review_profile('00000000-0000-4000-a000-000000000001','approved');
select private.review_profile('00000000-0000-4000-a000-000000000002','approved');
select private.review_post('audit-only-post','approved');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated","email":"audit-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000001"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=2 from public.student_profiles where id in('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002')),'reviewed peers visible');
insert into public.student_profiles(id,display_name,program,is_discoverable,contact_email,updated_at)
values('00000000-0000-4000-a000-000000000001','Audit A','Test Program',true,'audit-a@example.invalid',now())
on conflict(id) do update set id=excluded.id,display_name=excluded.display_name,program=excluded.program,is_discoverable=excluded.is_discoverable,contact_email=excluded.contact_email,updated_at=excluded.updated_at;
select pg_temp.assert_true((select moderation_status='approved' from public.student_profiles where id='00000000-0000-4000-a000-000000000001'),'unchanged profile upsert preserves approval');
select public.report_content('profile','00000000-0000-4000-a000-000000000002','spam');
select public.report_content('profile','00000000-0000-4000-a000-000000000002','spam');
select public.report_content('post','audit-only-post','rights');
select public.change_profile_block('00000000-0000-4000-a000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.student_profiles where id='00000000-0000-4000-a000-000000000002'),'block hides peer');
select pg_temp.assert_true((select count(*)=1 from public.my_profile_blocks()),'caller can manage own blocks');
do $$ begin
 begin perform (select count(*) from private.content_reports); raise exception 'queue exposed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
select pg_temp.assert_true((select count(*)=2 from private.content_reports where reporter_id='00000000-0000-4000-a000-000000000001'),'report duplicate prevention');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated","email":"audit-b@example.invalid","session_id":"00000000-0000-4000-b000-000000000002"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.student_profiles where id='00000000-0000-4000-a000-000000000001'),'block hides in other direction');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated","email":"audit-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000001"}',true);
set local role authenticated;
select public.change_profile_block('00000000-0000-4000-a000-000000000002',false);
select pg_temp.assert_true((select count(*)=1 from public.student_profiles where id='00000000-0000-4000-a000-000000000002'),'unblock restores peer');
update public.student_profiles set bio='Changed content' where id='00000000-0000-4000-a000-000000000001';
select pg_temp.assert_true((select moderation_status='approved' from public.student_profiles where id='00000000-0000-4000-a000-000000000001'),'edit publishes automatically');
reset role;
select set_config('request.jwt.claims','{}',true);
select private.review_profile('00000000-0000-4000-a000-000000000001','suspended');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated","email":"audit-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000001"}',true);
set local role authenticated;
do $$ begin
 begin update public.student_profiles set bio='Edit while restricted' where id='00000000-0000-4000-a000-000000000001'; raise exception 'restricted edit allowed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at,synced_at)
values('audit-only-post','rarenightclub','https://www.instagram.com/p/audit-only-post/','Test caption',now(),now())
on conflict(id) do update set source_username=excluded.source_username,post_url=excluded.post_url,caption=excluded.caption,synced_at=excluded.synced_at,moderation_status=excluded.moderation_status;
select pg_temp.assert_true((select moderation_status='approved' from public.instagram_feed_posts where id='audit-only-post'),'unchanged scraper upsert preserves approval even if defaults sent');
update public.instagram_feed_posts set image_url='https://example.invalid/changed.jpg' where id='audit-only-post';
select pg_temp.assert_true((select moderation_status='pending' from public.instagram_feed_posts where id='audit-only-post'),'invalid feed image is held');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated","email":"audit-a@example.invalid","session_id":"00000000-0000-4000-b000-000000000001"}',true);
delete from auth.sessions where id='00000000-0000-4000-b000-000000000001';
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.student_profiles),'revoked session denied profiles');
do $$ begin
 begin perform public.change_profile_block('00000000-0000-4000-a000-000000000002',true); raise exception 'revoked session allowed block'; exception when insufficient_privilege then null; end;
 begin perform public.report_content('post','audit-only-post','spam'); raise exception 'revoked session allowed report'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
delete from auth.users where id in('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002');
select pg_temp.assert_true((select count(*)=0 from private.content_reports where reporter_id='00000000-0000-4000-a000-000000000001'),'deletion removes reports');
select pg_temp.assert_true((select count(*)=0 from private.profile_blocks where user_id='00000000-0000-4000-a000-000000000001'),'deletion removes blocks');
rollback;
select 'Moderation checks passed; all synthetic data rolled back' as result;
