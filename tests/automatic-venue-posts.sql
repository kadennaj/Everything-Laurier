begin;
create function pg_temp.assert_true(p boolean,p_label text) returns void language plpgsql as $$ begin if p is distinct from true then raise exception 'FAILED: %',p_label; end if; end; $$;
grant execute on function pg_temp.assert_true(boolean,text) to anon,authenticated,service_role;
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at)
values('audit_auto_venue','thepubonking','https://www.instagram.com/p/audit_auto_venue/','Synthetic venue announcement',now()),
 ('audit_bad_url','thepubonking','https://example.invalid/p/audit_bad_url/','Synthetic invalid URL',now());
select pg_temp.assert_true((select moderation_status='approved' from public.instagram_feed_posts where id='audit_auto_venue'),'selected venue publishes automatically');
select pg_temp.assert_true((select moderation_status='pending' from public.instagram_feed_posts where id='audit_bad_url'),'invalid URLs never automatically publish');
set local role anon;
select pg_temp.assert_true((select count(*)=1 from public.instagram_feed_posts where id in('audit_auto_venue','audit_bad_url')),'guest sees published post only');
do $$ begin
 begin update public.instagram_feed_posts set moderation_status='approved' where id='audit_bad_url'; raise exception 'client approval unexpectedly allowed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
update public.instagram_feed_posts set caption='Updated venue announcement' where id='audit_auto_venue';
select pg_temp.assert_true((select moderation_status='approved' from public.instagram_feed_posts where id='audit_auto_venue'),'changed valid venue imports do not require human approval');
reset role;
select set_config('request.jwt.claims','{}',true);
select private.review_post('audit_auto_venue','rejected');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at)
values('audit_auto_venue','thepubonking','https://www.instagram.com/p/audit_auto_venue/','Edited after removal',now())
on conflict(id) do update set caption=excluded.caption,moderation_status=excluded.moderation_status;
select pg_temp.assert_true((select moderation_status='rejected' from public.instagram_feed_posts where id='audit_auto_venue'),'sync cannot restore a removed post even after caption changes');
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at)
values('audit_auto_venue','thepubonking','https://www.instagram.com/p/audit_auto_venue/','Edited after removal',now())
on conflict(id) do update set caption=excluded.caption,moderation_status=excluded.moderation_status;
select pg_temp.assert_true((select moderation_status='rejected' from public.instagram_feed_posts where id='audit_auto_venue'),'unchanged upsert cannot restore a removed post');
reset role;
set local role anon;
select pg_temp.assert_true((select count(*)=0 from public.instagram_feed_posts where id in('audit_auto_venue','audit_bad_url')),'removed and invalid posts are hidden from guests');
reset role;
rollback;
select 'Automatic publication checks passed; synthetic data rolled back' as result;
