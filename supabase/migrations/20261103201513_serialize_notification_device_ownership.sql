-- Serialize competing registrations for a token, including different accounts.
do $$ declare body text; begin
 select pg_get_functiondef('private.nightlife_notifications(text,jsonb)'::regprocedure) into body;
 if position('on conflict(token) do update set session_id=excluded.session_id,last_seen_at=now();' in body)=0 then raise exception 'Review registration function before extending'; end if;
 body:=replace(body,'if exists(select 1 from private.nightlife_push_devices where token=v_token and user_id<>auth.uid())',
 'perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(''push-token''),pg_catalog.hashtext(v_token));
  if exists(select 1 from private.nightlife_push_devices where token=v_token and user_id<>auth.uid())');
 body:=replace(body,'on conflict(token) do update set session_id=excluded.session_id,last_seen_at=now();',
 'on conflict(token) do update set session_id=excluded.session_id,last_seen_at=now() where nightlife_push_devices.user_id=auth.uid();
  if not found then raise exception ''Device is linked to another account'' using errcode=''42501''; end if;');
 execute body;
end; $$;
notify pgrst,'reload schema';
