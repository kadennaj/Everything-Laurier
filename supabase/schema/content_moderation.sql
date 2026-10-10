-- Human review prevents unreviewed text/images reaching the public directory/feed.
-- Run after account_deletion.sql. No client can approve content or read the report queue.
alter table public.student_profiles add column moderation_status text not null default 'pending'
  check (moderation_status in ('pending','approved','rejected','suspended'));
alter table public.instagram_feed_posts add column moderation_status text not null default 'pending'
  check (moderation_status in ('pending','approved','rejected'));

create table private.profile_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,target_id), check(user_id <> target_id)
);
create index profile_blocks_target_idx on private.profile_blocks(target_id,user_id);
create table private.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references auth.users(id) on delete cascade,
  post_id text references public.instagram_feed_posts(id) on delete cascade,
  reason text not null check(reason in ('harassment','hate','sexual','violence','privacy','spam','misleading','rights')),
  created_at timestamptz not null default now(),
  status text not null default 'open' check(status in ('open','resolved','dismissed')),
  resolved_at timestamptz,
  check ((profile_id is null) <> (post_id is null))
);
create index content_reports_profile_idx on private.content_reports(profile_id);
create index content_reports_post_idx on private.content_reports(post_id);
create index content_reports_reporter_time_idx on private.content_reports(reporter_id,created_at desc);
create index content_reports_open_idx on private.content_reports(created_at) where status='open';
alter table private.profile_blocks enable row level security;
alter table private.content_reports enable row level security;
create policy "No client table access" on private.profile_blocks for all to anon,authenticated using(false) with check(false);
create policy "No client table access" on private.content_reports for all to anon,authenticated using(false) with check(false);
revoke all on private.profile_blocks, private.content_reports from public, anon, authenticated;

create function private.profiles_blocked(p_target uuid) returns boolean
language sql stable security definer set search_path=''
as $$ select exists(select 1 from private.profile_blocks b where
 (b.user_id=auth.uid() and b.target_id=p_target) or (b.target_id=auth.uid() and b.user_id=p_target)); $$;
revoke all on function private.profiles_blocked(uuid) from public,anon;
grant execute on function private.profiles_blocked(uuid) to authenticated;
drop policy "Students see their own and discoverable profiles" on public.student_profiles;
create policy "Students see reviewed unblocked profiles and their own"
on public.student_profiles for select to authenticated using (
 id=(select auth.uid()) or (is_discoverable and moderation_status='approved' and not private.profiles_blocked(id))
);
drop policy "Anyone can read venue posts" on public.instagram_feed_posts;
create policy "Anyone can read reviewed venue posts" on public.instagram_feed_posts
for select to anon,authenticated using(moderation_status='approved');
revoke insert,update on public.student_profiles from authenticated;
grant insert(id,display_name,program,year_label,bio,is_discoverable,contact_email,updated_at),
 update(id,display_name,program,year_label,bio,is_discoverable,contact_email,updated_at)
 on public.student_profiles to authenticated;

create function private.review_profile_changes() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then new.moderation_status:='pending';
 elsif (new.display_name,new.program,new.year_label,new.bio,new.contact_email) is distinct from
       (old.display_name,old.program,old.year_label,old.bio,old.contact_email) then
   new.moderation_status:=case when old.moderation_status='suspended' then 'suspended' else 'pending' end;
 elsif (auth.jwt()->>'role')='authenticated' then new.moderation_status:=old.moderation_status;
 end if;
 if tg_op='UPDATE' and old.moderation_status='suspended' and auth.uid()=old.id then
   raise exception 'This profile is restricted. Contact support for a review.' using errcode='42501';
 end if;
 return new;
end; $$;
create function private.review_feed_changes() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then new.moderation_status:='pending';
 elsif (new.caption,new.image_url,new.source_username,new.post_url,new.media_type) is distinct from
       (old.caption,old.image_url,old.source_username,old.post_url,old.media_type) then
   new.moderation_status:='pending';
 elsif (auth.jwt()->>'role')='service_role' then new.moderation_status:=old.moderation_status;
 end if;
 return new;
end; $$;
revoke all on function private.review_profile_changes(),private.review_feed_changes() from public,anon,authenticated;
create trigger review_profile_changes before insert or update on public.student_profiles
for each row execute function private.review_profile_changes();
create trigger review_feed_changes before insert or update on public.instagram_feed_posts
for each row execute function private.review_feed_changes();

create function private.change_profile_block(p_target uuid,p_block boolean) returns void
language plpgsql security definer set search_path='' as $$
declare v_name text;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 if p_target is null or p_target=auth.uid() or p_block is null then raise exception 'Invalid profile'; end if;
 if p_block then
   select display_name into v_name from public.student_profiles where id=p_target and is_discoverable and moderation_status='approved';
   if v_name is null then raise exception 'Profile unavailable'; end if;
   insert into private.profile_blocks(user_id,target_id,display_name) values(auth.uid(),p_target,v_name) on conflict do nothing;
 else delete from private.profile_blocks where user_id=auth.uid() and target_id=p_target;
 end if;
end; $$;
create function private.my_profile_blocks() returns table(target_id uuid,display_name text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 return query select b.target_id,b.display_name,b.created_at from private.profile_blocks b where b.user_id=auth.uid() order by b.created_at desc;
end; $$;
create function private.report_content(p_kind text,p_target text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v_profile uuid;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 if p_reason is null or p_reason not in ('harassment','hate','sexual','violence','privacy','spam','misleading','rights') then raise exception 'Choose a listed reason'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('content_reports'),pg_catalog.hashtext(auth.uid()::text));
 if (select count(*) from private.content_reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then
   raise exception 'Too many reports. Please contact support.';
 end if;
 if p_kind='profile' then
   begin v_profile:=p_target::uuid; exception when invalid_text_representation then raise exception 'Profile unavailable'; end;
   if v_profile is null or v_profile=auth.uid() or not exists(select 1 from public.student_profiles where id=v_profile and is_discoverable and moderation_status='approved')
      or private.profiles_blocked(v_profile) then raise exception 'Profile unavailable'; end if;
   if exists(select 1 from private.content_reports where reporter_id=auth.uid() and profile_id=v_profile and status='open') then return; end if;
   insert into private.content_reports(reporter_id,profile_id,reason) values(auth.uid(),v_profile,p_reason);
 elsif p_kind='post' then
   if not exists(select 1 from public.instagram_feed_posts where id=p_target and moderation_status='approved') then raise exception 'Post unavailable'; end if;
   if exists(select 1 from private.content_reports where reporter_id=auth.uid() and post_id=p_target and status='open') then return; end if;
   insert into private.content_reports(reporter_id,post_id,reason) values(auth.uid(),p_target,p_reason);
 else raise exception 'Invalid content type'; end if;
end; $$;
revoke all on function private.change_profile_block(uuid,boolean),private.my_profile_blocks(),private.report_content(text,text,text) from public,anon;
grant execute on function private.change_profile_block(uuid,boolean),private.my_profile_blocks(),private.report_content(text,text,text) to authenticated;
create function public.change_profile_block(p_target uuid,p_block boolean) returns void
language sql security invoker set search_path='' as $$ select private.change_profile_block(p_target,p_block); $$;
create function public.my_profile_blocks() returns table(target_id uuid,display_name text,created_at timestamptz)
language sql stable security invoker set search_path='' as $$ select * from private.my_profile_blocks(); $$;
create function public.report_content(p_kind text,p_target text,p_reason text) returns void
language sql security invoker set search_path='' as $$ select private.report_content(p_kind,p_target,p_reason); $$;
revoke all on function public.change_profile_block(uuid,boolean),public.my_profile_blocks(),public.report_content(text,text,text) from public,anon;
grant execute on function public.change_profile_block(uuid,boolean),public.my_profile_blocks(),public.report_content(text,text,text) to authenticated;

-- Operator uses the authenticated Supabase database administration interface.
-- Never expose these functions as client RPCs or distribute service-role credentials.
create function private.review_profile(p_id uuid,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_decision is null or p_decision not in ('approved','rejected','suspended') then raise exception 'Invalid decision'; end if;
 update public.student_profiles set moderation_status=p_decision where id=p_id;
 if not found then raise exception 'Profile unavailable'; end if;
end; $$;
create function private.review_post(p_id text,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 update public.instagram_feed_posts set moderation_status=p_decision where id=p_id;
 if not found then raise exception 'Post unavailable'; end if;
end; $$;
create function private.resolve_content_report(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_status is null or p_status not in ('resolved','dismissed') then raise exception 'Invalid decision'; end if;
 update private.content_reports set status=p_status,resolved_at=now() where id=p_id;
 if not found then raise exception 'Report unavailable'; end if;
end; $$;
revoke all on function private.review_profile(uuid,text),private.review_post(text,text),private.resolve_content_report(uuid,text) from public,anon,authenticated,service_role;
