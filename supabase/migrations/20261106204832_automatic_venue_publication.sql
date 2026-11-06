-- Source validation is not content screening. The operator requested automatic
-- publication for the four selected venues; explicit removals remain removed.
create or replace function private.review_feed_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare changed boolean; valid boolean; reviewed boolean:=coalesce(current_setting('app.owner_review',true),'')='1';
begin
 valid:=new.source_username in ('rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo')
  and new.id ~ '^[A-Za-z0-9_-]{1,128}$'
  and new.post_url ~ ('^https://www[.]instagram[.]com/(p|reel)/'||new.id||'/$')
  and (new.image_url is null or new.image_url ~ '^https://[^/?#:@]+[.](cdninstagram[.]com|fbcdn[.]net)/')
  and new.posted_at<=now()+interval '5 minutes';
 if tg_op='INSERT' then
  new.moderation_status:=case when valid then 'approved' else 'pending' end;
  new.moderation_revision:=1;
  return new;
 end if;
 changed:=(new.caption,new.image_url,new.source_username,new.post_url,new.media_type,new.posted_at) is distinct from
  (old.caption,old.image_url,old.source_username,old.post_url,old.media_type,old.posted_at);
 if changed then
  new.moderation_status:=case when old.moderation_status='rejected' then 'rejected' when valid then 'approved' else 'pending' end;
 elsif not reviewed then new.moderation_status:=old.moderation_status;
 end if;
 new.moderation_revision:=old.moderation_revision+case when changed or new.moderation_status is distinct from old.moderation_status then 1 else 0 end;
 return new;
end; $$;
revoke all on function private.review_feed_changes() from public,anon,authenticated,service_role;

-- Publishing the existing backlog must not send a burst of historical alerts.
do $$ declare body text; begin
 select pg_get_functiondef('private.enqueue_nightlife_push()'::regprocedure) into body;
 if position('if new.moderation_status' in body)=0 then raise exception 'Review notification trigger before changing'; end if;
 execute replace(body,'if new.moderation_status',
  'if current_setting(''app.venue_backfill'',true)=''1'' then return new; end if;
 if new.moderation_status');
end; $$;
select set_config('app.venue_backfill','1',true);
select set_config('app.owner_review','1',true);
update public.instagram_feed_posts set moderation_status='approved'
where moderation_status='pending'
 and source_username in ('rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo')
 and id ~ '^[A-Za-z0-9_-]{1,128}$'
 and post_url ~ ('^https://www[.]instagram[.]com/(p|reel)/'||id||'/$')
 and (image_url is null or image_url ~ '^https://[^/?#:@]+[.](cdninstagram[.]com|fbcdn[.]net)/')
 and posted_at<=now()+interval '5 minutes';
select set_config('app.owner_review','0',true);
select set_config('app.venue_backfill','0',true);
notify pgrst,'reload schema';
