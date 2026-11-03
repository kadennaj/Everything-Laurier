-- Check account terms at the server boundary as well as in the settings screen.
do $$ declare body text; begin
 select pg_get_functiondef('private.nightlife_notifications(text,jsonb)'::regprocedure) into body;
 if position('fields:=case p_action' in body)=0 then raise exception 'Review notification function before extending'; end if;
 body:=replace(body,'fields:=case p_action',$guard$
 if p_action='register' or (p_action='save' and p_payload->>'enabled'='true') then
  if not exists(select 1 from private.account_consents where user_id=auth.uid() and terms_version='2026-10-17' and age_16_confirmed) then
   raise exception 'Accept account terms before enabling alerts' using errcode='42501';
  end if;
 end if;
 fields:=case p_action$guard$);
 execute body;
end; $$;
notify pgrst,'reload schema';
