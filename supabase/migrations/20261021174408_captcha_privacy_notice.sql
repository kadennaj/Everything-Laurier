-- Record the current privacy notice for new acknowledgments; keep prior records and terms version.
CREATE OR REPLACE FUNCTION private.account_privacy(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();
begin
 if not private.account_session_active() then raise exception 'Sign in again' using errcode='42501'; end if;
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
end; $function$
;
