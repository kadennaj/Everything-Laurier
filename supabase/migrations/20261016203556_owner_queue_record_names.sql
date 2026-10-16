create or replace function private.owner_portal(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare application_row private.tutor_applications; report_row private.content_reports; v_decision text;
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
$$;