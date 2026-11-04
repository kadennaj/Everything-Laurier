-- POST requests to these RPCs run the aggregate quota hook, which writes
-- private usage counters. STABLE makes PostgREST open a read-only transaction
-- before the hook executes. Keep the private read functions STABLE, but allow
-- the public request transaction to record its quota without changing grants.
alter function public.my_profile_blocks() volatile;
alter function public.account_session_active() volatile;
notify pgrst,'reload schema';
