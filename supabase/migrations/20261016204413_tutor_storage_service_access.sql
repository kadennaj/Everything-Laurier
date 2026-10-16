alter table private.tutor_applications add column withdrawn_at timestamptz;
create or replace function private.tutor_portal(p_action text,p_payload jsonb default '{}') returns jsonb
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
   update private.tutor_applications set status='withdrawn',withdrawn_at=now() where id=v_id returning * into a;
  end if;
  return to_jsonb(a);
 else raise exception 'Unknown action'; end if;
end;
$$;
create or replace function private.expire_tutor_applications() returns void
language plpgsql security definer set search_path='' as $$
begin
 update private.tutor_applications a set status='withdrawn',withdrawn_at=now(),review_note='Expired before review. You may apply again.'
 where a.status='pending' and a.created_at<now()-interval '90 days'
  and not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=a.transcript_path);
 delete from private.tutor_applications a where
  (a.status='draft' and a.created_at<now()-interval '1 day'
   or a.status in ('withdrawn','rejected') and coalesce(a.withdrawn_at,a.reviewed_at,a.created_at)<now()-interval '90 days')
  and not exists(select 1 from storage.objects where bucket_id='tutor-transcripts' and name=a.transcript_path);
end;
$$;
-- Explicit deny policies document that all app reads go through guarded functions.
create policy "No direct owner table access" on private.app_owners for all to anon,authenticated using(false) with check(false);
create policy "No direct application table access" on private.tutor_applications for all to anon,authenticated using(false) with check(false);
create policy "No direct review log access" on private.owner_review_log for all to anon,authenticated using(false) with check(false);
grant usage on schema private to service_role;
