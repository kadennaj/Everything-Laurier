import {tutorCleanupHandler} from './handler.ts';
Deno.serve(tutorCleanupHandler({url:Deno.env.get('SUPABASE_URL')??'',serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',tokenHash:Deno.env.get('FEED_SYNC_TOKEN_HASH')??'69bad17854952652aa91bd52191ab46dcb5dcfe1e40160d18c97694f039b42d0',fetch}));
