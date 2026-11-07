-- Keep the existing guard, extending only its authenticated POST allowlist.
do $$
declare body text;
begin
  select pg_get_functiondef('public.check_api_request()'::regprocedure) into body;
  if position('''rpc/submit_venue_line_report''' in body) = 0 then
    if position('''rpc/nightlife_notifications''' in body) = 0 then
      raise exception 'Review API guard before extending the line-report allowlist';
    end if;
    execute replace(body, '''rpc/nightlife_notifications''',
      '''rpc/nightlife_notifications'',''rpc/submit_venue_line_report''');
  end if;
end;
$$;
