-- Durable, atomic limits on user mutations. Public browsing uses bounded shared
-- caches; this is not an edge/IP DDoS filter for Auth, GET, or Realtime traffic.
create table private.usage_buckets (
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null, window_start timestamptz not null, requests integer not null,
 primary key(user_id,action,window_start)
);
create table private.account_consents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 terms_version text not null, privacy_version text not null,
 age_16_confirmed boolean not null check(age_16_confirmed),
 accepted_at timestamptz not null default now()
);
create table private.job_budgets (
 job text not null check(job in ('instagram','calendar')),
 day date not null, attempts integer not null default 0,
 last_started timestamptz, primary key(job,day)
);
alter table private.usage_buckets enable row level security;
alter table private.account_consents enable row level security;
alter table private.job_budgets enable row level security;
revoke all on private.usage_buckets,private.account_consents,private.job_budgets from public,anon,authenticated;

create function private.consume_usage(p_action text,p_limit integer,p_seconds integer) returns void
language plpgsql security definer set search_path='' as $$
declare v_count integer; v_start timestamptz;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 v_start:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 insert into private.usage_buckets(user_id,action,window_start,requests) values(auth.uid(),p_action,v_start,1)
 on conflict(user_id,action,window_start) do update set requests=private.usage_buckets.requests+1
 returning requests into v_count;
 if v_count>p_limit then raise exception 'Usage limit reached. Wait and try again, or contact support.' using errcode='P0001'; end if;
end; $$;
revoke all on function private.consume_usage(text,integer,integer) from public,anon,authenticated;

create function private.require_account_consent() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.account_session_active() or not exists(select 1 from private.account_consents where user_id=auth.uid() and terms_version='2026-10-17' and age_16_confirmed) then
  raise exception 'Review the terms and age confirmation in Your data before sharing information.' using errcode='42501';
 end if;
end; $$;
revoke all on function private.require_account_consent() from public,anon,authenticated;

create function private.guard_user_mutation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'authenticated' then return new; end if;
 if tg_table_name='student_profiles' then
  if private.is_app_owner() and current_setting('app.owner_review',true)='1' then return new; end if;
  if not (tg_op='UPDATE' and not new.is_discoverable and new.contact_email is null and
   (new.display_name,new.program,new.year_label,new.bio) is not distinct from (old.display_name,old.program,old.year_label,old.bio)) then
   perform private.require_account_consent();
  end if;
  perform private.consume_usage('profile',20,600);
 elsif tg_table_name='venue_line_reports' then
  perform private.require_account_consent();
  perform private.consume_usage('line',1,60);
  perform private.consume_usage('line_daily',30,86400);
 elsif tg_table_name='profile_blocks' then
  perform private.consume_usage('block',30,600);
 elsif tg_table_name='content_reports' then
  perform private.consume_usage('report',10,3600);
 elsif tg_table_name='tutor_applications' and tg_op='INSERT' then
  perform private.require_account_consent();
  perform private.consume_usage('application_daily',10,86400);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('global-tutor-daily'));
  if (select count(*) from private.tutor_applications where created_at>=date_trunc('day',now()))>=200 then
   raise exception 'Applications are at today’s capacity. Please try tomorrow.';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.guard_user_mutation() from public,anon,authenticated;
create trigger guard_profile_usage after insert or update on public.student_profiles for each row execute function private.guard_user_mutation();
create trigger guard_line_usage after insert or update on private.venue_line_reports for each row execute function private.guard_user_mutation();
create trigger guard_block_usage before insert on private.profile_blocks for each row execute function private.guard_user_mutation();
create trigger guard_report_usage before insert on private.content_reports for each row execute function private.guard_user_mutation();
create trigger guard_application_usage before insert on private.tutor_applications for each row execute function private.guard_user_mutation();

-- One immutable object per reserved application, JPEG only, bucket limit 8 MiB.
-- Serialize insert authorization so concurrent uploads cannot exceed the cap.
create or replace function private.transcript_access(p_name text,p_operation text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
begin
 if not private.account_session_active() then return false; end if;
 if p_operation='insert' then
  perform private.require_account_consent();
  if not exists(select 1 from private.tutor_applications where transcript_path=p_name and user_id=auth.uid() and status='draft') then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('transcript-capacity'));
  if (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='tutor-transcripts')>1073741824-8388608 then
   raise exception 'Transcript storage is at capacity. Contact support before retrying.';
  end if;
  perform private.consume_usage('transcript_upload',10,86400);
  return true;
 end if;
 return exists(select 1 from private.tutor_applications a where a.transcript_path=p_name and case p_operation
  when 'read' then (a.user_id=auth.uid() and a.status in ('draft','pending','approved','rejected')) or private.is_app_owner()
  when 'delete' then a.user_id=auth.uid() or private.is_app_owner() else false end);
end; $$;

create function private.account_privacy(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 perform private.consume_usage('privacy_controls',30,600);
 if p_action='accept' then
  if p_payload->>'terms_version' is distinct from '2026-10-17' or p_payload->>'age_16_confirmed' is distinct from 'true' then raise exception 'Confirm the current terms and minimum age.'; end if;
  insert into private.account_consents(user_id,terms_version,privacy_version,age_16_confirmed) values(v_user,'2026-10-17','2026-10-17',true)
  on conflict(user_id) do update set terms_version=excluded.terms_version,privacy_version=excluded.privacy_version,age_16_confirmed=true,accepted_at=now();
 elsif p_action='hide_profile' then
  update public.student_profiles set is_discoverable=false,contact_email=null where id=v_user;
 elsif p_action not in ('summary','export') then raise exception 'Unknown privacy action'; end if;
 if p_action='export' then
  perform private.consume_usage('data_export',3,3600);
  return jsonb_build_object('exported_at',now(),
   'account',(select jsonb_build_object('id',id,'email',email,'created_at',created_at,'email_confirmed_at',email_confirmed_at) from auth.users where id=v_user),
   'consent',(select to_jsonb(c)-'user_id' from private.account_consents c where user_id=v_user),
   'profile',(select to_jsonb(p) from public.student_profiles p where id=v_user),
   'applications',coalesce((select jsonb_agg(to_jsonb(a)-'reviewed_by') from private.tutor_applications a where user_id=v_user),'[]'),
   'line_reports',coalesce((select jsonb_agg(to_jsonb(l)-'user_id') from private.venue_line_reports l where user_id=v_user),'[]'),
   'content_reports',coalesce((select jsonb_agg(to_jsonb(r)-'reporter_id') from (select * from private.content_reports where reporter_id=v_user order by created_at desc limit 1000) r),'[]'),
   'blocks',coalesce((select jsonb_agg(to_jsonb(b)-'user_id') from private.profile_blocks b where user_id=v_user),'[]'),
   'limits','Content reports include up to 1,000 most recent records. Transcript image files, support correspondence and provider security logs are separate; contact privacy support for access.');
 end if;
 return jsonb_build_object('consent',(select to_jsonb(c)-'user_id' from private.account_consents c where user_id=v_user),
  'profile',(select jsonb_build_object('name',display_name,'program',program,'discoverable',is_discoverable) from public.student_profiles where id=v_user),
  'applications',(select count(*) from private.tutor_applications where user_id=v_user),
  'reports',(select count(*) from private.content_reports where reporter_id=v_user),
  'blocks',(select count(*) from private.profile_blocks where user_id=v_user));
end; $$;
revoke all on function private.account_privacy(text,jsonb) from public,anon;
grant execute on function private.account_privacy(text,jsonb) to authenticated;
create function public.account_privacy(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select private.account_privacy(p_action,p_payload); $$;
revoke all on function public.account_privacy(text,jsonb) from public,anon;
grant execute on function public.account_privacy(text,jsonb) to authenticated;

-- Reserve a paid attempt BEFORE calling the provider; failures consume budget.
create function private.claim_sync_budget(p_job text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_attempts integer; v_started timestamptz;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server access required' using errcode='42501'; end if;
 if p_job not in ('instagram','calendar') or p_job is null then raise exception 'Unknown job'; end if;
 insert into private.job_budgets(job,day) values(p_job,(now() at time zone 'UTC')::date) on conflict do nothing;
 select attempts,last_started into v_attempts,v_started from private.job_budgets where job=p_job and day=(now() at time zone 'UTC')::date for update;
 if v_attempts>=6 or v_started>now()-interval '1 hour' then return false; end if;
 update private.job_budgets set attempts=attempts+1,last_started=now() where job=p_job and day=(now() at time zone 'UTC')::date;
 return true;
end; $$;
revoke all on function private.claim_sync_budget(text) from public,anon,authenticated;
grant execute on function private.claim_sync_budget(text) to service_role;
create function public.claim_sync_budget(p_job text) returns boolean language sql security invoker set search_path='' as $$ select private.claim_sync_budget(p_job); $$;
revoke all on function public.claim_sync_budget(text) from public,anon,authenticated;
grant execute on function public.claim_sync_budget(text) to service_role;

create function private.security_usage() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_app_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 perform private.consume_usage('owner_usage',30,600);
 return jsonb_build_object('jobs',coalesce((select jsonb_agg(to_jsonb(b)) from private.job_budgets b where day=(now() at time zone 'UTC')::date),'[]'),
 'transcript_bytes',(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='tutor-transcripts'),
 'storage_cap_bytes',1073741824,'new_applications_today',(select count(*) from private.tutor_applications where created_at>=date_trunc('day',now())),
 'application_daily_cap',200,'instagram_attempt_daily_cap',6,'instagram_max_usd_per_attempt',0.05);
end; $$;
revoke all on function private.security_usage() from public,anon;
grant execute on function private.security_usage() to authenticated;
create function public.security_usage() returns jsonb language sql security invoker set search_path='' as $$ select private.security_usage(); $$;
revoke all on function public.security_usage() from public,anon;
grant execute on function public.security_usage() to authenticated;
select cron.schedule('expire-safety-counters','45 6 * * *',$cron$delete from private.usage_buckets where window_start<now()-interval '2 days'; delete from private.job_budgets where day<(now() at time zone 'UTC')::date-32;$cron$);

CREATE OR REPLACE FUNCTION private.owner_portal(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare application_row private.tutor_applications; report_row private.content_reports; v_decision text;
begin
 if not private.is_app_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 perform private.consume_usage('owner_portal',120,600);
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
  select * into application_row from private.tutor_applications where id=(p_payload->>'id')::uuid for update;
  if not found or application_row.status<>coalesce(p_payload->>'expected_status','pending') or application_row.status not in ('pending','approved') then
   raise exception 'Application changed. Refresh before reviewing.';
  end if;
  if char_length(trim(coalesce(p_payload->>'note','')))>1000 then raise exception 'Review note is too long'; end if;
  if v_decision='approved' and not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=application_row.transcript_path) then
   raise exception 'Transcript is missing. Do not approve without reviewing it.';
  end if;
  update private.tutor_applications set status=v_decision,review_note=trim(coalesce(p_payload->>'note','')),reviewed_at=now(),reviewed_by=auth.uid() where id=application_row.id;
  insert into private.owner_review_log(actor,application_id,action) values(auth.uid(),application_row.id,v_decision);
  return 'true'::jsonb;
 elsif p_action='review_report' then
  select * into report_row from private.content_reports where id=(p_payload->>'id')::uuid for update;
  if not found or report_row.status<>'open' then raise exception 'Report changed. Refresh before reviewing.'; end if;
  v_decision:=p_payload->>'decision';
  if v_decision='remove' then
   perform set_config('app.owner_review','1',true);
   if report_row.tutor_application_id is not null then
    update private.tutor_applications set status='rejected',review_note='Listing removed after content review.',reviewed_at=now(),reviewed_by=auth.uid() where id=report_row.tutor_application_id;
   elsif report_row.profile_id is not null then perform private.review_profile(report_row.profile_id,'suspended');
   else perform private.review_post(report_row.post_id,'rejected'); end if;
   perform private.resolve_content_report(report_row.id,'resolved');
  elsif v_decision in ('resolved','dismissed') then
   perform private.resolve_content_report(report_row.id,v_decision);
  else raise exception 'Invalid decision'; end if;
  insert into private.owner_review_log(actor,report_id,action) values(auth.uid(),report_row.id,v_decision);
  return 'true'::jsonb;
 else raise exception 'Unknown action'; end if;
end;
$function$;


CREATE OR REPLACE FUNCTION private.tutor_portal(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a private.tutor_applications; v_id uuid; v_email text; v_result jsonb;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 perform private.consume_usage('tutor_portal',120,600);
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
   update private.tutor_applications set status='withdrawn',withdrawn_at=now() where id=v_id returning * into a;
  end if;
  return to_jsonb(a);
 else raise exception 'Unknown action'; end if;
end;
$function$;
