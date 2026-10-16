-- Additive feature schema. No public transcript bucket, client admin flag, or service key.
create table private.app_owners (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.app_owners enable row level security;
revoke all on private.app_owners from public, anon, authenticated;
-- The operator explicitly selected this verified account. No automatic email-based role grants.
insert into private.app_owners(user_id)
select id from auth.users where lower(email)='everythinglaurier@gmail.com' and email_confirmed_at is not null;

create function private.is_app_owner() returns boolean
language sql stable security definer set search_path='' as $$
 select private.account_session_active() and exists(
  select 1 from private.app_owners o join auth.users u on u.id=o.user_id
  where o.user_id=auth.uid() and u.email_confirmed_at is not null
 );
$$;
revoke all on function private.is_app_owner() from public,anon;
grant execute on function private.is_app_owner() to authenticated;

create table private.tutor_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 2 and 80),
 contact_email text not null,
 course_code text not null check(course_code ~ '^[A-Z]{2,5}[0-9]{3}[A-Z]?$'),
 course_name text not null check(char_length(course_name) between 3 and 120),
 term_completed text not null check(char_length(term_completed) between 4 and 80),
 approach text not null check(char_length(approach) between 30 and 1200),
 experience text not null check(char_length(experience) <= 1200),
 availability text not null check(char_length(availability) between 5 and 400),
 hourly_rate numeric(6,2) not null check(hourly_rate between 0 and 200),
 transcript_path text not null unique,
 consent_version text not null default '2026-10-16',
 status text not null default 'draft' check(status in ('draft','pending','approved','rejected','withdrawn')),
 review_note text not null default '' check(char_length(review_note)<=1000),
 created_at timestamptz not null default now(),
 submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null
);
create unique index tutor_active_course on private.tutor_applications(user_id,course_code)
 where status in ('draft','pending','approved');
create index tutor_application_queue on private.tutor_applications(status,created_at desc);
alter table private.tutor_applications enable row level security;
revoke all on private.tutor_applications from public,anon,authenticated;

alter table private.content_reports add column tutor_application_id uuid references private.tutor_applications(id) on delete cascade;
alter table private.content_reports drop constraint content_reports_check;
alter table private.content_reports add constraint content_reports_one_target check(num_nonnulls(profile_id,post_id,tutor_application_id)=1);
create index content_reports_tutor_idx on private.content_reports(tutor_application_id);

create table private.owner_review_log (
 id uuid primary key default gen_random_uuid(),
 actor uuid references auth.users(id) on delete set null,
 application_id uuid references private.tutor_applications(id) on delete cascade,
 report_id uuid references private.content_reports(id) on delete cascade,
 action text not null,
 created_at timestamptz not null default now()
);
alter table private.owner_review_log enable row level security;
revoke all on private.owner_review_log from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tutor-transcripts','tutor-transcripts',false,8388608,array['image/jpeg']);

-- Check the application as well as the path; arbitrary files and overwrites are denied.
create function private.transcript_access(p_name text,p_operation text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.account_session_active() and exists(
  select 1 from private.tutor_applications a where a.transcript_path=p_name and
   case p_operation
    when 'insert' then a.user_id=auth.uid() and a.status='draft'
    when 'read' then (a.user_id=auth.uid() and a.status in ('draft','pending','approved','rejected')) or private.is_app_owner()
    when 'delete' then a.user_id=auth.uid() or private.is_app_owner()
    else false end
 );
$$;
revoke all on function private.transcript_access(text,text) from public,anon;
grant execute on function private.transcript_access(text,text) to authenticated;
create policy "Applicant uploads own reserved transcript" on storage.objects for insert to authenticated
 with check(bucket_id='tutor-transcripts' and private.transcript_access(name,'insert'));
create policy "Private transcript reads" on storage.objects for select to authenticated
 using(bucket_id='tutor-transcripts' and private.transcript_access(name,'read'));
create policy "Applicant or owner removes transcript" on storage.objects for delete to authenticated
 using(bucket_id='tutor-transcripts' and private.transcript_access(name,'delete'));

create function private.tutor_portal(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.tutor_applications; v_id uuid; v_email text; v_result jsonb;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 if p_action='mine' then
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from
   (select * from private.tutor_applications where user_id=auth.uid() order by created_at desc limit 50)t),'[]');
 elsif p_action='directory' then
  -- Only expressly opted-in, manually approved fields leave the private application table.
  return coalesce((select jsonb_agg(to_jsonb(t)) from (
   select id,display_name,contact_email,course_code,course_name,approach,availability,hourly_rate
   from private.tutor_applications where status='approved'
    and (coalesce(p_payload->>'query','')='' or position(upper(left(p_payload->>'query',120)) in upper(course_code||' '||course_name))>0)
   order by course_code,display_name,id limit 100 offset greatest(0,least(10000,coalesce((p_payload->>'offset')::int,0))))t),'[]');
 elsif p_action='create' then
  if p_payload->>'consent' is distinct from 'true' then raise exception 'Consent is required'; end if;
  select email into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if v_email is null then raise exception 'Verify your email first' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('tutor-application'),pg_catalog.hashtext(auth.uid()::text));
  if (select count(*) from private.tutor_applications where user_id=auth.uid() and created_at>now()-interval '1 hour')>=5
   or (select count(*) from private.tutor_applications where user_id=auth.uid() and status in ('draft','pending','approved'))>=10 then
   raise exception 'Application limit reached. Contact support.';
  end if;
  v_id:=gen_random_uuid();
  insert into private.tutor_applications(id,user_id,display_name,contact_email,course_code,course_name,term_completed,approach,experience,availability,hourly_rate,transcript_path)
  values(v_id,auth.uid(),trim(p_payload->>'display_name'),v_email,upper(regexp_replace(p_payload->>'course_code','\s','','g')),
   trim(p_payload->>'course_name'),trim(p_payload->>'term_completed'),trim(p_payload->>'approach'),trim(coalesce(p_payload->>'experience','')),
   trim(p_payload->>'availability'),(p_payload->>'hourly_rate')::numeric,auth.uid()::text||'/'||v_id::text||'/transcript.jpg') returning * into a;
  return to_jsonb(a);
 elsif p_action in ('submit','withdraw') then
  v_id:=(p_payload->>'id')::uuid;
  select * into a from private.tutor_applications where id=v_id and user_id=auth.uid() for update;
  if not found then raise exception 'Application unavailable' using errcode='42501'; end if;
  if p_action='submit' then
   if a.status<>'draft' then raise exception 'Application has already been submitted'; end if;
   if not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=a.transcript_path
     and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 8388608) then
    raise exception 'Upload the transcript image before submitting';
   end if;
   update private.tutor_applications set status='pending',submitted_at=now() where id=v_id returning * into a;
  else
   update private.tutor_applications set status='withdrawn' where id=v_id returning * into a;
  end if;
  return to_jsonb(a);
 else raise exception 'Unknown action'; end if;
end;
$$;
revoke all on function private.tutor_portal(text,jsonb) from public,anon;
grant execute on function private.tutor_portal(text,jsonb) to authenticated;
create function public.tutor_portal(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select private.tutor_portal(p_action,p_payload); $$;
revoke all on function public.tutor_portal(text,jsonb) from public,anon;
grant execute on function public.tutor_portal(text,jsonb) to authenticated;

create function private.owner_portal(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.tutor_applications; r private.content_reports; v_result jsonb; v_decision text;
begin
 if not private.is_app_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_action='access' then return 'true'::jsonb;
 elsif p_action='applications' then
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from
   (select * from private.tutor_applications where status=coalesce(p_payload->>'status','pending') order by created_at,id limit 100 offset greatest(0,least(10000,coalesce((p_payload->>'offset')::int,0))))t),'[]');
 elsif p_action='reports' then
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from (
   select r.id,r.reason,r.status,r.created_at,r.profile_id,r.post_id,r.tutor_application_id,
    coalesce(p.display_name,a.display_name) as display_name,p.program,p.bio,p.moderation_status as profile_status,
    coalesce(f.caption,a.course_code||' · '||a.approach) as caption,f.image_url,f.post_url,f.source_username,f.moderation_status as post_status
   from private.content_reports r left join public.student_profiles p on p.id=r.profile_id
    left join public.instagram_feed_posts f on f.id=r.post_id left join private.tutor_applications a on a.id=r.tutor_application_id
   where r.status=coalesce(p_payload->>'status','open') order by r.created_at,r.id limit 100 offset greatest(0,least(10000,coalesce((p_payload->>'offset')::int,0))))t),'[]');
 elsif p_action='review_application' then
  v_decision:=p_payload->>'decision';
  if v_decision is null or v_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into a from private.tutor_applications where id=(p_payload->>'id')::uuid for update;
  if not found or a.status<>coalesce(p_payload->>'expected_status','pending') or a.status not in ('pending','approved') then
   raise exception 'Application changed. Refresh before reviewing.';
  end if;
  if char_length(trim(coalesce(p_payload->>'note','')))>1000 then raise exception 'Review note is too long'; end if;
  if v_decision='approved' and not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=a.transcript_path) then
   raise exception 'Transcript is missing. Do not approve without reviewing it.';
  end if;
  update private.tutor_applications set status=v_decision,review_note=trim(coalesce(p_payload->>'note','')),reviewed_at=now(),reviewed_by=auth.uid() where id=a.id;
  insert into private.owner_review_log(actor,application_id,action) values(auth.uid(),a.id,v_decision);
  return 'true'::jsonb;
 elsif p_action='review_report' then
  select * into r from private.content_reports where id=(p_payload->>'id')::uuid for update;
  if not found or r.status<>'open' then raise exception 'Report changed. Refresh before reviewing.'; end if;
  v_decision:=p_payload->>'decision';
  if v_decision='remove' then
   perform set_config('app.owner_review','1',true);
   if r.tutor_application_id is not null then
    update private.tutor_applications set status='rejected',review_note='Listing removed after content review.',reviewed_at=now(),reviewed_by=auth.uid() where id=r.tutor_application_id;
   elsif r.profile_id is not null then perform private.review_profile(r.profile_id,'suspended');
   else perform private.review_post(r.post_id,'rejected'); end if;
   perform private.resolve_content_report(r.id,'resolved');
  elsif v_decision in ('resolved','dismissed') then
   perform private.resolve_content_report(r.id,v_decision);
  else raise exception 'Invalid decision'; end if;
  insert into private.owner_review_log(actor,report_id,action) values(auth.uid(),r.id,v_decision);
  return 'true'::jsonb;
 else raise exception 'Unknown action'; end if;
end;
$$;
revoke all on function private.owner_portal(text,jsonb) from public,anon;
grant execute on function private.owner_portal(text,jsonb) to authenticated;
create function public.owner_portal(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select private.owner_portal(p_action,p_payload); $$;
revoke all on function public.owner_portal(text,jsonb) from public,anon;
grant execute on function public.owner_portal(text,jsonb) to authenticated;

-- Keep ordinary automatic profile publication while allowing guarded owner removals.
create or replace function private.review_profile_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_client boolean := coalesce(auth.jwt()->>'role','')='authenticated'
    or current_setting('role',true)='authenticated';
  v_publishable boolean;
begin
  if private.is_app_owner() and current_setting('app.owner_review',true)='1' then return new; end if;
  v_publishable := new.is_discoverable and exists (
    select 1 from auth.users u where u.id=new.id and u.email_confirmed_at is not null
      and lower(u.email)=lower(new.contact_email)
  );
  if tg_op='INSERT' then
    new.moderation_status := case when v_publishable then 'approved' else 'pending' end;
  elsif v_client then
    if old.moderation_status='suspended' then
      raise exception 'This profile is restricted. Contact support for a review.' using errcode='42501';
    end if;
    -- A user edit or an upsert's INSERT defaults cannot undo an operator removal.
    new.moderation_status := case when old.moderation_status='rejected' then 'rejected'
      when v_publishable then 'approved' else 'pending' end;
  elsif new.moderation_status is distinct from old.moderation_status then
    -- A trusted database administrator can explicitly remove/restore a profile.
    return new;
  elsif (new.display_name,new.program,new.year_label,new.bio,new.contact_email,new.is_discoverable) is distinct from
        (old.display_name,old.program,old.year_label,old.bio,old.contact_email,old.is_discoverable) then
    new.moderation_status := case when old.moderation_status in ('rejected','suspended') then old.moderation_status
      when v_publishable then 'approved' else 'pending' end;
  else
    new.moderation_status := old.moderation_status;
  end if;
  return new;
end;
$$;
revoke all on function private.review_profile_changes() from public,anon,authenticated;

-- Only the server maintenance/deletion functions can enumerate removal candidates.
create function private.tutor_storage_cleanup(p_user_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(name) from (
  select o.name from storage.objects o left join private.tutor_applications a on a.transcript_path=o.name
  where o.bucket_id='tutor-transcripts' and (
   (p_user_id is not null and split_part(o.name,'/',1)=p_user_id::text) or
   (p_user_id is null and (a.id is null or a.status='withdrawn'
    or a.status='draft' and a.created_at<now()-interval '1 day'
    or a.status='pending' and a.created_at<now()-interval '90 days'
    or a.reviewed_at<now()-interval '30 days')))
  order by o.name limit 1000)t),'[]');
end;
$$;
revoke all on function private.tutor_storage_cleanup(uuid) from public,anon,authenticated;
grant execute on function private.tutor_storage_cleanup(uuid) to service_role;
create function public.tutor_storage_cleanup(p_user_id uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.tutor_storage_cleanup(p_user_id); $$;
revoke all on function public.tutor_storage_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.tutor_storage_cleanup(uuid) to service_role;

-- Expire applications only after their original evidence is unavailable; retain only
-- opted-in active listings and a short decision record, never unbounded transcript history.
create function private.expire_tutor_applications() returns void
language plpgsql security definer set search_path='' as $$
begin
 update private.tutor_applications a set status='withdrawn',review_note='Expired before review. You may apply again.'
 where a.status='pending' and a.created_at<now()-interval '90 days'
  and not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=a.transcript_path);
 delete from private.tutor_applications a where
  (a.status='draft' and a.created_at<now()-interval '1 day'
   or a.status in ('withdrawn','rejected') and coalesce(a.reviewed_at,a.created_at)<now()-interval '90 days')
  and not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=a.transcript_path);
end;
$$;
revoke all on function private.expire_tutor_applications() from public,anon,authenticated,service_role;
select cron.schedule('expire-tutor-applications','30 6 * * *',$cron$ select private.expire_tutor_applications(); $cron$);


select cron.schedule('cleanup-tutor-transcripts','0 6 * * *',$cron$
 select net.http_post(url:='https://ekptnmermhvtrdqpjwwa.supabase.co/functions/v1/tutor-storage-cleanup',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='instagram_feed_sync_secret')),
 body:='{}'::jsonb,timeout_milliseconds:=120000);
$cron$);

-- Preserve the existing report limits and add approved tutor listings.
create or replace function private.report_content(p_kind text,p_target text,p_reason text) returns void
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
 elsif p_kind='tutor' then
   begin v_profile:=p_target::uuid; exception when invalid_text_representation then raise exception 'Listing unavailable'; end;
   if not exists(select 1 from private.tutor_applications where id=v_profile and status='approved' and user_id<>auth.uid()) then raise exception 'Listing unavailable'; end if;
   if exists(select 1 from private.content_reports where reporter_id=auth.uid() and tutor_application_id=v_profile and status='open') then return; end if;
   insert into private.content_reports(reporter_id,tutor_application_id,reason) values(auth.uid(),v_profile,p_reason);
 else raise exception 'Invalid content type'; end if;
end; $$;
