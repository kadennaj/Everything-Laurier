# Endpoint write protection — October 21, 2026

Deployed to the connected Everything-Laurier Supabase project. The installed app works with these server changes; no new phone build is needed.

## Authentication controls

Verified in the live dashboard and reloaded after saving:

| Control | Setting |
| --- | --- |
| Sign-in/sign-up requests | 15 per 5 minutes per IP |
| OTP/magic-link verification | 10 per 5 minutes per IP |
| Sign-in emails | Existing project-wide 30/hour cap retained |
| Email resend interval | Existing 60 seconds per user retained |
| Token refresh | Existing 150 per 5 minutes per IP retained |
| IP address forwarding | Off |
| CAPTCHA | Existing server-verified Turnstile retained; a missing-token live request was rejected |

Supabase uses token buckets: these settings govern sustained traffic and do not promise a hard simultaneous-attempt count. Shared campus Wi-Fi can reach a per-IP limit; review actual traffic before any increase. See [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

Auth metadata now accepts only the existing email-provider keys (`sub`, `email`, `email_verified`, `phone_verified`), with type and 2 KiB size checks. Arbitrary nested data or custom admin fields cannot be stored there. Authorization still uses the server-owned owner table and active sessions, never user metadata. Adding another identity provider requires explicitly reviewing its metadata shape. Standard metadata creation/update was tested as database fixtures; the managed Auth service role cannot be impersonated through the database connector, so an additional real sign-in remains a useful smoke test.

## Data API

- Imported posts, event data, sync status and anonymous line summaries are read-only to app/guest roles. Excess write, truncate, trigger and related table privileges were removed. Existing row policies still control visibility.
- Profiles allow only the intended editable columns and the user's own row. Moderation status and another account's profile remain protected. Existing size constraints remain.
- A PostgREST pre-request hook permits writes only to the existing profile endpoint and approved RPCs. Other app-role write paths are denied. The service role retains its server maintenance paths.
- Authenticated write/RPC requests share fixed-window caps of 20/10 seconds, 60/minute, and 1,200/hour, in addition to existing profile, report, line, application, transcript, portal and export quotas. Fixed windows can allow bursts at boundaries. HTTP quota errors include 429 and Retry-After.
- Portal implementations validate JSON object size (16 KiB), allowlisted actions/fields, scalar types, booleans, IDs and pagination before privileged operations. Unexpected role/status/user-ID fields cannot be mass-assigned. Existing table constraints supply required-field and business-value checks.
- Declared Data API request lengths over 32 KiB are rejected; absent/spoofed length headers do not bypass the portal's actual field/payload checks. This is not a raw-stream size cap for every PostgREST endpoint.
- Future functions created by the app's postgres role no longer receive automatic PUBLIC execution. Future tables created by that role need explicit app grants. Existing functions retain their existing grants.

The hook applies to PostgREST, not Auth, Storage, Realtime or Edge Functions. GET/HEAD requests are read-only and cannot write durable counters; request increments also roll back if the SQL transaction fails. Consequently these database limits count committed requests and do not fully limit malicious rejected traffic or public read floods. RLS, session checks, field constraints and provider controls remain essential. See [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Account deletion and server jobs

The delete-account Edge Function now bounds request bodies to 1 KiB and five seconds, including chunked bodies without Content-Length, and bounds bearer length. A verified active account reserves one deletion attempt/minute and three/day in a separate transaction before logout or storage/admin operations. Unknown body fields and target user IDs remain rejected. A failure does not falsely report deletion success.

Scheduled imports/cleanup retain server-only token checks. Paid imports keep their existing frequency, daily attempt and provider-charge caps. Transcript upload keeps its existing per-user and global storage caps. No secrets or privileged keys were added to the app.

## Verification

- Migration `20261021193654_endpoint_write_guards` applied; delete-account v3 deployed.
- New rollback-only database suite passed: ownership, guest denial, forged admin metadata, unknown actions/fields, wrong types, oversized input, minute/hour/burst quotas, deletion quotas, revoked sessions and public calendar access.
- Existing safety/privacy, tutor/owner access, moderation, automatic student publication, and venue publication SQL suites passed. All synthetic rows/counters rolled back; no endpoint test users remained.
- App typecheck/lint and 69 unit tests passed, including rejected/stalled/chunked deletion bodies and quota denial before destructive operations.
- Low-volume live HTTP probes confirmed calendar access (200), guest write/owner/deletion denial (401), and missing-CAPTCHA login rejection (400). No brute-force/load test or real-account deletion was performed.
- Supabase security advisors reported no new findings. Existing warnings remain: [pg_net in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Private counter/consent tables intentionally have RLS with no client policies and no app grants (deny by default).

Administrator MFA, provider billing alerts/caps and any additional network-level protection against public read/rejected-request floods remain release follow-ups. These changes reduce attack paths; they are not a guarantee against compromise or a total provider-invoice cap.
