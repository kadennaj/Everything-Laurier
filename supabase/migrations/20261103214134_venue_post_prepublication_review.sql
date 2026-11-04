-- Every venue caption and media item needs an owner decision before publication.
alter table public.instagram_feed_posts add column moderation_revision integer not null default 1 check(moderation_revision>0);
alter table private.owner_review_log add column post_id text references public.instagram_feed_posts(id) on delete cascade;
create index owner_review_log_post on private.owner_review_log(post_id) where post_id is not null;
create or replace function private.review_feed_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare changed boolean; reviewed boolean:=coalesce(current_setting('app.owner_review',true),'')='1'; begin
 if tg_op='INSERT' then new.moderation_status:='pending'; new.moderation_revision:=1; return new; end if;
 changed:=(new.caption,new.image_url,new.source_username,new.post_url,new.media_type,new.posted_at) is distinct from
  (old.caption,old.image_url,old.source_username,old.post_url,old.media_type,old.posted_at);
 if changed then new.moderation_status:=case when old.moderation_status='rejected' then 'rejected' else 'pending' end;
 elsif not reviewed then new.moderation_status:=old.moderation_status;
 end if;
 new.moderation_revision:=old.moderation_revision+case when changed or new.moderation_status is distinct from old.moderation_status then 1 else 0 end;
 return new;
end; $$;
revoke all on function private.review_feed_changes() from public,anon,authenticated,service_role;
create or replace function private.review_post(p_id text,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
declare item public.instagram_feed_posts; begin
 if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 select * into item from public.instagram_feed_posts where id=p_id for update;
 if not found then raise exception 'Post unavailable'; end if;
 if p_decision='approved' and not (
  item.source_username in ('rarenightclub','prohibitionwarehouse','thepubonking','kentuckywaterloo')
  and item.id ~ '^[A-Za-z0-9_-]{1,128}$'
  and item.post_url ~ ('^https://www[.]instagram[.]com/(p|reel)/'||item.id||'/$')
  and (item.image_url is null or item.image_url ~ '^https://[^/?#:@]+[.](cdninstagram[.]com|fbcdn[.]net)/')
  and item.posted_at<=now()+interval '5 minutes'
 ) then raise exception 'Source or media URL is invalid'; end if;
 perform set_config('app.owner_review','1',true);
 update public.instagram_feed_posts set moderation_status=p_decision where id=p_id;
 -- Reset context so later import statements cannot inherit review permission.
 perform set_config('app.owner_review','0',true);
end; $$;
revoke all on function private.review_post(text,text) from public,anon,authenticated,service_role;
-- Extend the established owner RPC and its strict validator, preserving guards.
do $$ declare body text; begin
 select pg_get_functiondef('private.validate_portal_request(text,text,jsonb)'::regprocedure) into body;
 if position('when ''review_profile'' then' in body)=0 then raise exception 'Review current validator before extending'; end if;
 body:=replace(body,'''applications'',''reports'',''profiles''','''applications'',''reports'',''profiles'',''posts''');
 body:=replace(body,'when ''review_profile'' then','when ''review_post'' then allowed:=array[''id'',''decision'',''expected_revision'',''expected_status''];
   when ''review_profile'' then');
 body:=replace(body,'when ''availability'' then 400','when ''id'' then case when p_api=''owner'' and p_action=''review_post'' then 128 else 80 end when ''availability'' then 400');
 body:=replace(body,'if k=''id'' and (v#>>''{}'') !~*',
 'if k=''id'' and p_api=''owner'' and p_action=''review_post'' then
    if (v#>>''{}'') !~ ''^[A-Za-z0-9_-]{1,128}$'' then raise exception ''Invalid post'' using errcode=''22023''; end if;
   elsif k=''id'' and (v#>>''{}'') !~*');
 execute body;
 select pg_get_functiondef('private.owner_portal(text,jsonb)'::regprocedure) into body;
 if position('if p_action=''access'' then' in body)=0 then raise exception 'Review owner portal before extending'; end if;
 body:=replace(body,'profile_row public.student_profiles;','profile_row public.student_profiles; post_row public.instagram_feed_posts;');
 body:=replace(body,'if p_action=''access'' then',$branch$
 if p_action='posts' then
  if coalesce(p_payload->>'status','pending') not in ('pending','approved','rejected') then raise exception 'Invalid status'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.posted_at desc,t.id) from (
   select id,source_username,caption,image_url,post_url,media_type,posted_at,moderation_status,moderation_revision
   from public.instagram_feed_posts where moderation_status=coalesce(p_payload->>'status','pending')
   order by posted_at desc,id limit 50 offset coalesce((p_payload->>'offset')::int,0))t),'[]');
 elsif p_action='review_post' then
  v_decision:=p_payload->>'decision';
  if v_decision is null or v_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into post_row from public.instagram_feed_posts where id=p_payload->>'id' for update;
  if not found or post_row.moderation_revision is distinct from (p_payload->>'expected_revision')::int
   or post_row.moderation_status is distinct from (p_payload->>'expected_status') then raise exception 'Post changed. Refresh before reviewing.'; end if;
  perform private.review_post(post_row.id,v_decision);
  insert into private.owner_review_log(actor,post_id,action) values(auth.uid(),post_row.id,'post_'||v_decision);
  return 'true'::jsonb;
 elsif p_action='access' then$branch$);
 execute body;
end; $$;
-- Earlier automatic approvals do not prove an individual media review.
select set_config('app.owner_review','1',true);
update public.instagram_feed_posts set moderation_status='pending' where moderation_status='approved';
select set_config('app.owner_review','0',true);
delete from private.nightlife_push_deliveries d using public.instagram_feed_posts p where d.post_id=p.id and d.status='pending' and p.moderation_status<>'approved';
notify pgrst,'reload schema';
