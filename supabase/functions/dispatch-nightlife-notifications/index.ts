import { dispatch } from './handler.ts';
Deno.serve(request => dispatch(request, { url: Deno.env.get('SUPABASE_URL'), key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), secretHash: '73b8b13a809478d1c17a39b70cee2aeff02f8fcb360a71e95a04f95f768bb4dd' }));
