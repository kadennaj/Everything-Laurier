-- All shared profile text is screened by the operator before publication.
-- Revision numbers are server-owned so an old review cannot approve newer text.
alter table public.student_profiles add column moderation_revision integer not null default 1 check(moderation_revision>0);
alter table private.owner_review_log add column profile_id uuid references auth.users(id) on delete cascade;
create index student_profile_review_queue on public.student_profiles(moderation_status,updated_at,id) where is_discoverable;
create index owner_review_log_profile_idx on private.owner_review_log(profile_id) where profile_id is not null;
create or replace function private.review_profile_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare
 v_client boolean:=coalesce(auth.jwt()->>'role','')='authenticated' or current_setting('role',true)='authenticated';
 v_review boolean:=private.is_app_owner() and current_setting('app.owner_review',true)='1';
 v_changed boolean;
begin
 if tg_op='INSERT' then
  new.moderation_status:='pending'; new.moderation_revision:=1; new.updated_at:=clock_timestamp();
  return new;
 end if;
 v_changed:=(new.display_name,new.program,new.year_label,new.bio,new.contact_email,new.is_discoverable) is distinct from
  (old.display_name,old.program,old.year_label,old.bio,old.contact_email,old.is_discoverable);
 if v_client and not v_review and old.moderation_status='suspended' and
   (new.is_discoverable or (new.display_name,new.program,new.year_label,new.bio) is distinct from (old.display_name,old.program,old.year_label,old.bio)) then
  raise exception 'This profile is restricted. Contact support for a review.' using errcode='42501';
 end if;
 if v_changed then
  new.updated_at:=clock_timestamp();
  new.moderation_status:=case when old.moderation_status='suspended' then 'suspended' else 'pending' end;
 elsif v_client and not v_review then
  -- Upserts carry INSERT defaults: these cannot clear an earlier review.
  new.moderation_status:=old.moderation_status;
 end if;
 new.moderation_revision:=old.moderation_revision+case when v_changed or new.moderation_status is distinct from old.moderation_status then 1 else 0 end;
 return new;
end; $$;
revoke all on function private.review_profile_changes() from public,anon,authenticated;
-- Previously auto-published profiles have no individual review evidence. Hold
-- them too, without deleting their text or changing their sharing preference.
update public.student_profiles set moderation_status='pending' where moderation_status='approved';

create or replace function private.validate_portal_request(p_api text,p_action text,p_payload jsonb) returns void
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
   when 'applications','reports','profiles' then allowed:=array['status','offset'];
   when 'review_application' then allowed:=array['id','decision','note','expected_status'];
   when 'review_profile' then allowed:=array['id','decision','expected_revision'];
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
  elsif k='expected_revision' then
   if jsonb_typeof(v)<>'number' or v::text !~ '^[0-9]{1,10}$' or (v::text)::numeric not between 1 and 2147483647 then raise exception 'Invalid revision' using errcode='22023'; end if;
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


CREATE OR REPLACE FUNCTION private.owner_portal(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare application_row private.tutor_applications; report_row private.content_reports; v_decision text; profile_row public.student_profiles;
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
 elsif p_action='profiles' then
  if coalesce(p_payload->>'status','pending') not in ('pending','approved','rejected','suspended') then raise exception 'Invalid status'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at,t.id) from (
   select id,display_name,program,year_label,bio,contact_email,moderation_status,moderation_revision,updated_at
   from public.student_profiles where is_discoverable and moderation_status=coalesce(p_payload->>'status','pending')
   order by updated_at,id limit 100 offset coalesce((p_payload->>'offset')::int,0))t),'[]');
 elsif p_action='review_profile' then
  v_decision:=p_payload->>'decision';
  if v_decision is null or v_decision not in ('approved','rejected','suspended') then raise exception 'Invalid decision'; end if;
  select * into profile_row from public.student_profiles where id=(p_payload->>'id')::uuid for update;
  if not found or not profile_row.is_discoverable or profile_row.moderation_revision is distinct from (p_payload->>'expected_revision')::int then
   raise exception 'Profile changed. Refresh before reviewing.';
  end if;
  if v_decision='approved' and not exists(select 1 from auth.users where id=profile_row.id and email_confirmed_at is not null and lower(email)=lower(profile_row.contact_email)) then
   raise exception 'A verified matching email is required before publication.';
  end if;
  perform set_config('app.owner_review','1',true);
  update public.student_profiles set moderation_status=v_decision where id=profile_row.id;
  insert into private.owner_review_log(actor,profile_id,action) values(auth.uid(),profile_row.id,'profile_'||v_decision);
  return 'true'::jsonb;
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


notify pgrst,'reload schema';
