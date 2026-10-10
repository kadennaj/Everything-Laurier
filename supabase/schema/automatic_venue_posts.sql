-- Selected venue imports publish automatically. This is source/URL validation,
-- not AI screening or a guarantee that the post meets every content rule.
-- Run after content_moderation.sql. Keep rejected posts removed across syncs.
create or replace function private.review_feed_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_valid boolean;
begin
 v_valid := new.source_username in (
   'rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo'
 ) and new.id ~ '^[A-Za-z0-9_-]+$'
   and new.post_url ~ ('^https://www[.]instagram[.]com/(p|reel)/' || new.id || '/$')
   and (new.image_url is null or new.image_url ~ '^https://[^/?#:@]+[.](cdninstagram[.]com|fbcdn[.]net)/')
   and new.posted_at <= now() + interval '5 minutes';
 if tg_op='INSERT' then
   new.moderation_status := case when v_valid then 'approved' else 'pending' end;
 elsif (new.caption,new.image_url,new.source_username,new.post_url,new.media_type,new.posted_at) is distinct from
       (old.caption,old.image_url,old.source_username,old.post_url,old.media_type,old.posted_at) then
   new.moderation_status := case
     when old.moderation_status='rejected' then 'rejected'
     when v_valid then 'approved' else 'pending' end;
 elsif (auth.jwt()->>'role')='service_role' then
   -- INSERT ... ON CONFLICT supplies the INSERT trigger's automatic approval.
   -- An unchanged import must never overwrite an operator removal or hold.
   new.moderation_status := old.moderation_status;
 end if;
 return new;
end; $$;
revoke all on function private.review_feed_changes() from public,anon,authenticated;

-- Release only the selected, structurally valid imports previously held pending.
-- Never undo an operator rejection. Do not change student-profile moderation.
update public.instagram_feed_posts
set moderation_status='approved'
where moderation_status='pending'
 and source_username in ('rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo')
 and id ~ '^[A-Za-z0-9_-]+$'
 and post_url ~ ('^https://www[.]instagram[.]com/(p|reel)/' || id || '/$')
 and (image_url is null or image_url ~ '^https://[^/?#:@]+[.](cdninstagram[.]com|fbcdn[.]net)/')
 and posted_at <= now() + interval '5 minutes';

alter policy "Anyone can read reviewed venue posts" on public.instagram_feed_posts
 rename to "Anyone can read published venue posts";
