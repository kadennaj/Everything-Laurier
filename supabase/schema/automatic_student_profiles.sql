-- Apply after content_moderation.sql. Publish opted-in, email-verified profiles
-- automatically; reporting, bilateral blocks and operator removals still apply.
create or replace function private.review_profile_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_client boolean := coalesce(auth.jwt()->>'role','')='authenticated'
    or current_setting('role',true)='authenticated';
  v_publishable boolean;
begin
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

-- Release previously pending profiles only when the owner already opted in and
-- the public contact address matches the verified account. Never restore removals.
update public.student_profiles p set moderation_status='approved'
where p.moderation_status='pending' and p.is_discoverable
  and exists(select 1 from auth.users u where u.id=p.id and u.email_confirmed_at is not null
    and lower(u.email)=lower(p.contact_email));

alter policy "Students see reviewed unblocked profiles and their own" on public.student_profiles
  rename to "Students see published unblocked profiles and their own";
