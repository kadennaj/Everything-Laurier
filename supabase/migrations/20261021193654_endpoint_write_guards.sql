-- Server-enforced request shape, least privilege and aggregate write quotas.
-- Existing per-feature quotas, row ownership and active-session checks remain.
revoke all on public.instagram_feed_posts,public.official_events,public.official_event_sync,public.venue_line_status from public,anon,authenticated;
grant select on public.instagram_feed_posts,public.official_events,public.official_event_sync,public.venue_line_status to anon,authenticated;
revoke all on public.student_profiles from public,anon,authenticated;
grant select on public.student_profiles to authenticated;
grant insert(id,display_name,program,year_label,bio,is_discoverable,contact_email,updated_at),
 update(id,display_name,program,year_label,bio,is_discoverable,contact_email,updated_at) on public.student_profiles to authenticated;
-- Future functions need explicit API grants instead of automatic PUBLIC execution.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke all on tables from anon,authenticated;

create function private.validate_portal_request(p_api text,p_action text,p_payload jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare allowed text[]; k text; v jsonb;
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16384 then
  raise exception 'Invalid request payload' using errcode='22023';
 end if;
 if p_api='tutor' then
  case p_action
   when 'mine' then allowed:='{}';
   when 'directory' then allowed:=array['query','offset'];
   when 'create' then allowed:=array['display_name','course_code','course_name','term_completed','approach','experience','availability','hourly_rate','consent'];
   when 'submit','withdraw' then allowed:=array['id'];
   else raise exception 'Unknown action' using errcode='22023';
  end case;
 elsif p_api='owner' then
  case p_action
   when 'access' then allowed:='{}';
   when 'applications','reports' then allowed:=array['status','offset'];
   when 'review_application' then allowed:=array['id','decision','note','expected_status'];
   when 'review_report' then allowed:=array['id','decision'];
   else raise exception 'Unknown action' using errcode='22023';
  end case;
 elsif p_api='privacy' then
  case p_action
   when 'accept' then allowed:=array['terms_version','age_16_confirmed'];
   when 'summary','export','hide_profile' then allowed:='{}';
   else raise exception 'Unknown action' using errcode='22023';
  end case;
 else raise exception 'Unknown API' using errcode='22023';
 end if;
 for k,v in select * from jsonb_each(p_payload) loop
  if not (k=any(allowed)) then raise exception 'Unexpected request field' using errcode='22023'; end if;
  if k in ('consent','age_16_confirmed') then
   if jsonb_typeof(v)<>'boolean' then raise exception 'Expected a confirmation' using errcode='22023'; end if;
  elsif k='hourly_rate' then
   if jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 200 then raise exception 'Invalid hourly rate' using errcode='22023'; end if;
  elsif k='offset' then
   if jsonb_typeof(v)<>'number' or v::text !~ '^[0-9]{1,5}$' or (v::text)::int>10000 then raise exception 'Invalid page' using errcode='22023'; end if;
  else
   if jsonb_typeof(v)<>'string' then raise exception 'Expected text' using errcode='22023'; end if;
   if char_length(v#>>'{}') > (case k
     when 'display_name' then 80 when 'course_code' then 20 when 'course_name' then 120
     when 'term_completed' then 80 when 'approach' then 1200 when 'experience' then 1200
     when 'availability' then 400 when 'note' then 1000 when 'query' then 120 else 80 end) then
    raise exception 'Request field is too long' using errcode='22023';
   end if;
   if k='id' and (v#>>'{}') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then raise exception 'Invalid record' using errcode='22023'; end if;
  end if;
 end loop;
end; $$;
revoke all on function private.validate_portal_request(text,text,jsonb) from public,anon,authenticated;

create function private.check_api_write_budget() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 begin
  perform private.consume_usage('api_write_burst',20,10);
  perform private.consume_usage('api_write_minute',60,60);
  perform private.consume_usage('api_write_hour',1200,3600);
 exception when sqlstate 'P0001' then
  raise sqlstate 'PGRST' using message='{"code":"request_rate_limit","message":"Too many requests. Wait before retrying.","details":null,"hint":null}',detail='{"status":429,"headers":{"Retry-After":"60"}}';
 end;
end; $$;
revoke all on function private.check_api_write_budget() from public,anon;
grant execute on function private.check_api_write_budget() to authenticated;

-- The public hook is invoker-only. Privileged quota access stays in private.
create function public.check_api_request() returns void
language plpgsql security invoker set search_path='' as $$
declare method text:=current_setting('request.method',true);
 path text:=ltrim(current_setting('request.path',true),'/');
 role_name text:=coalesce(auth.jwt()->>'role','');
 size_header text:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'content-length','');
begin
 if role_name='service_role' then return; end if;
 if method in ('GET','HEAD','OPTIONS') then return; end if;
 if method not in ('POST','PATCH','DELETE','PUT') or method is null then raise exception 'Unsupported request' using errcode='22023'; end if;
 -- Requests without a length header are still validated at the field/payload boundary.
 if size_header<>'' and (size_header !~ '^[0-9]{1,9}$' or size_header::numeric>32768) then
  raise sqlstate 'PGRST' using message='{"code":"request_too_large","message":"Request too large","details":null,"hint":null}',detail='{"status":413}';
 end if;
 if method='POST' and path='rpc/official_event_feed' then return; end if;
 if role_name<>'authenticated' then raise exception 'Sign in required' using errcode='42501'; end if;
 if not (path='student_profiles' and method in ('POST','PATCH') or method='POST' and path=any(array[
  'rpc/tutor_portal','rpc/owner_portal','rpc/account_privacy','rpc/report_content',
  'rpc/change_profile_block','rpc/my_profile_blocks','rpc/account_session_active','rpc/security_usage','rpc/claim_account_deletion'])) then
  raise exception 'Endpoint is not writable' using errcode='42501';
 end if;
 perform private.check_api_write_budget();
end; $$;
revoke all on function public.check_api_request() from public;
grant execute on function public.check_api_request() to anon,authenticated,service_role;

-- Do not replace any pre-existing hook silently.
do $$
declare existing text;
begin
 select split_part(setting,'=',2) into existing from pg_db_role_setting s join pg_roles r on r.oid=s.setrole,
 unnest(s.setconfig) setting where r.rolname='authenticator' and setting like 'pgrst.db_pre_request=%';
 if existing is not null and existing<>'public.check_api_request' then raise exception 'Review existing API hook before replacing it'; end if;
end; $$;
alter role authenticator set pgrst.db_pre_request='public.check_api_request';
notify pgrst,'reload config';
notify pgrst,'reload schema';
-- Validate inside privileged implementations, so wrappers cannot be bypassed.
CREATE OR REPLACE FUNCTION private.tutor_portal(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a private.tutor_applications; v_id uuid; v_email text; v_result jsonb;
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 perform private.validate_portal_request('tutor',p_action,p_payload);
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

CREATE OR REPLACE FUNCTION private.owner_portal(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare application_row private.tutor_applications; report_row private.content_reports; v_decision text;
begin
 if not private.is_app_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 perform private.validate_portal_request('owner',p_action,p_payload);
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

CREATE OR REPLACE FUNCTION private.account_privacy(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 perform private.validate_portal_request('privacy',p_action,p_payload);
 perform private.consume_usage('privacy_controls',30,600);
 if p_action='accept' then
  if p_payload->>'terms_version' is distinct from '2026-10-17' or p_payload->>'age_16_confirmed' is distinct from 'true' then raise exception 'Confirm the current terms and minimum age.'; end if;
  insert into private.account_consents(user_id,terms_version,privacy_version,age_16_confirmed) values(v_user,'2026-10-17','2026-10-21',true)
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
end; $function$;

-- The Edge Function reserves this quota before logout or any storage deletion.
create function private.claim_account_deletion() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
 begin
  perform private.consume_usage('delete_account_minute',1,60);
  perform private.consume_usage('delete_account_daily',3,86400);
 exception when sqlstate 'P0001' then
  raise sqlstate 'PGRST' using message='{"code":"request_rate_limit","message":"Too many deletion attempts. Wait before retrying.","details":null,"hint":null}',detail='{"status":429,"headers":{"Retry-After":"60"}}';
 end;
 return true;
end; $$;
revoke all on function private.claim_account_deletion() from public,anon;
grant execute on function private.claim_account_deletion() to authenticated;
create function public.claim_account_deletion() returns boolean language sql security invoker set search_path='' as $$select private.claim_account_deletion();$$;
revoke all on function public.claim_account_deletion() from public,anon;
grant execute on function public.claim_account_deletion() to authenticated;
notify pgrst,'reload schema';

-- This email-only app does not accept arbitrary blobs in Auth user metadata.
-- Authorization continues to use server-owned records, never these metadata keys.
create function private.validate_auth_metadata() returns trigger
language plpgsql security invoker set search_path='' as $$
declare data jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb); k text; v jsonb;
begin
 if jsonb_typeof(data)<>'object' or octet_length(data::text)>2048 then raise exception 'Invalid account metadata' using errcode='22023'; end if;
 for k,v in select * from jsonb_each(data) loop
  if k in ('email','sub') then
   if jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>254 then raise exception 'Invalid account metadata' using errcode='22023'; end if;
  elsif k in ('email_verified','phone_verified') then
   if jsonb_typeof(v)<>'boolean' then raise exception 'Invalid account metadata' using errcode='22023'; end if;
  else raise exception 'Unsupported account metadata' using errcode='22023';
  end if;
 end loop;
 return new;
end; $$;
revoke all on function private.validate_auth_metadata() from public,anon,authenticated;
grant execute on function private.validate_auth_metadata() to supabase_auth_admin;
create trigger validate_app_auth_metadata before insert or update of raw_user_meta_data on auth.users for each row execute function private.validate_auth_metadata();
