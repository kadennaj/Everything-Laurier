begin;
create function pg_temp.assert_true(p boolean,label text) returns void language plpgsql as $$ begin if p is distinct from true then raise exception 'FAILED: %',label; end if; end; $$;
grant execute on function pg_temp.assert_true(boolean,text) to anon,authenticated,service_role;
select set_config('app.venue_backfill','1',true);
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at) values
 ('auto_venue_test','rarenightclub','https://www.instagram.com/p/auto_venue_test/','Synthetic post',now()),
 ('auto_venue_bad','rarenightclub','https://evil.invalid/p/auto_venue_bad/','Synthetic invalid post',now()),
 ('auto_venue_future','rarenightclub','https://www.instagram.com/p/auto_venue_future/','Synthetic future post',now()+interval '1 day');
select pg_temp.assert_true((select moderation_status='approved' and moderation_revision=1 from public.instagram_feed_posts where id='auto_venue_test'),'selected venue publishes automatically');
select pg_temp.assert_true((select count(*)=2 from public.instagram_feed_posts where id in ('auto_venue_bad','auto_venue_future') and moderation_status='pending'),'invalid or future posts stay private');
select pg_temp.assert_true(not exists(select 1 from private.nightlife_push_deliveries where post_id='auto_venue_test'),'backfill does not queue historical notifications');
set local role anon;
select pg_temp.assert_true((select count(*)=1 from public.instagram_feed_posts where id in ('auto_venue_test','auto_venue_bad','auto_venue_future')),'guest sees only valid published post');
select pg_temp.assert_true(not has_table_privilege('anon','public.instagram_feed_posts','INSERT,UPDATE,DELETE'),'guest has no feed writes');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
update public.instagram_feed_posts set caption='Synthetic edit' where id='auto_venue_test';
reset role;
select pg_temp.assert_true((select moderation_status='approved' and moderation_revision=2 from public.instagram_feed_posts where id='auto_venue_test'),'valid edit stays published and increments revision');
select private.review_post('auto_venue_test','rejected');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
insert into public.instagram_feed_posts(id,source_username,post_url,caption,posted_at,moderation_status)
 select id,source_username,post_url,caption,posted_at,'approved' from public.instagram_feed_posts where id='auto_venue_test'
 on conflict(id) do update set caption=excluded.caption,moderation_status=excluded.moderation_status;
update public.instagram_feed_posts set caption='Synthetic edited removal',moderation_status='approved' where id='auto_venue_test';
reset role;
select pg_temp.assert_true((select moderation_status='rejected' from public.instagram_feed_posts where id='auto_venue_test'),'sync and edits cannot restore an owner removal');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.instagram_feed_posts','UPDATE'),'signed-in clients cannot write imported posts');
select pg_temp.assert_true(not has_function_privilege('authenticated','private.review_post(text,text)','EXECUTE'),'private review cannot be called directly');
select private.review_post('auto_venue_test','approved');
select pg_temp.assert_true((select moderation_status='approved' from public.instagram_feed_posts where id='auto_venue_test'),'operator can restore a removed valid post');
rollback;
