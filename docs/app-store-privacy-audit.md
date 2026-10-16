# App Store Section 5 audit — October 9, 2026

Scope: app source, Expo configuration, generated iOS configuration, installed dependencies, connected Supabase schema, and the new deletion endpoint. This is a technical audit, not a guarantee of App Review acceptance or an audit of every vendor's internal practices.

## Implemented and verified

- Dedicated `/privacy` screen, accessible to guests from More, Your space, and sign-in. `EXPO_PUBLIC_PRIVACY_POLICY_URL` accepts a public HTTPS URL without embedded credentials. The production EAS profile / explicit `APP_STORE_RELEASE=true` build gate rejects missing or invalid policy URLs. `npm run check:release-privacy` additionally verifies the page opens and is not the prepared draft. App Store Connect must also contain that URL.
- Account deletion is visible in Your space. A native React Native modal explains permanent, immediate live-data deletion, irreversible consequences, session revocation, local cleanup, and the limits of provider backups and previously shared copies.
- Deployed `delete-account` Edge Function authenticates with Supabase Auth, checks the server-side session, revokes all sessions, and hard-deletes only the verified account. Requests cannot specify another account ID. Failures are reported without exposing secrets or claiming deletion succeeded.
- Verified existing account/profile/report foreign keys cascade. Added a trigger to immediately recompute anonymous line estimates after reports are removed. Profile policies and both the public and private report writers require a live session, preventing stale access JWT reuse after deletion.
- Successful deletion clears the current device's saved items, pending email draft, and stored credentials. Account changes remount route content to discard cached profile data. Local cleanup failures are surfaced honestly after backend success.
- Supabase connections require HTTPS. The native transport policy forbids arbitrary insecure network loads; local networking remains available for development. No service-role credentials are included in app code.
- Removed the unused, vague Face ID purpose string from the generated plist and disabled its generation in the SecureStore plugin. No camera, photo library, location, microphone, contacts, or Bluetooth access is requested; their purpose strings are appropriately absent. Native permissions must be re-audited whenever such features are added.
- Corrected the native privacy manifest's empty collected-data declaration: name, email, user identifier, other user content, product interaction, search history, other diagnostic data, and other data (including authentication connection information), linked to the user for app functionality, without tracking. Preserved the existing required-reason API entries. App Store Connect privacy answers and the archived app's complete SDK privacy report still need review.
- No ad SDK, IDFA access, cross-company tracking code, AI/LLM endpoint, gambling, lottery, or real-money betting feature was found. ATT and gambling geo-fencing are not needed for the current feature set. Adding those features requires a fresh audit before enabling them.
- UI icons use Feather rather than SF Symbols. The app uses an original geometric EL app icon rather than its starter icon; neither the icon nor logo uses Apple emojis/system assets. No Apple sponsorship claim or deceptive system dialog was found. Ordinary links to Apple Maps identify the actual destination service.

## Validation

- 26 automated tests passed, including deletion authentication, explicit confirmation, target-ID rejection, revocation ordering, hard-delete semantics, error handling, and privacy URL validation.
- Database verification used temporary synthetic records inside a rolled-back transaction. It confirmed live profile access, cascading deletion, immediate aggregate refresh, stale-token denial for profile reads/report writes, and denied anonymous access to the session helper. No existing user's account was deleted.
- The deployed endpoint rejected missing and deliberately invalid bearer tokens with HTTP 401.
- Browser tests with mocked backend requests verified cancellation, failure/retry, deletion success, credential/bookmark removal, persistence after reload, and guest access to privacy. No real emails were sent or real accounts deleted by the browser tests.
- Lint, TypeScript checks, and web export passed. Generated plist/privacy-manifest inspection must stay in sync with app.json. An arm64 Simulator Release build succeeded and all packaged manifests/plists parsed successfully. The installed Xcode lacks the Simulator GUI, so runtime, signed distribution archive and physical-device/VoiceOver testing remain release checks. See `native-release-verification.md`.

## Remaining release requirements

1. The final policy is published at https://everythinglaurier.ca/privacy/ and copied to `privacy-policy.md`/`.html`. Support and community pages are also live; apex and www HTTPS certificates are active. The app and release gate use the verified policy URL. Existing email DNS records were preserved. Public contact is everythinglaurier@gmail.com. Confirm actual Supabase/Resend log and backup retention settings against the published policy, and add the URL to App Store Connect once the owner enrolls.
2. Confirm permission to use the Laurier/Students’ Union identity and directory content, and to display each venue's Instagram content under applicable service terms. Public availability of a post does not establish redistribution permission. The owner states the school approved the app. Preserve that approval and its scope; venue/media/service authorization remains unverified. Keep the independent-app disclosure.
3. Review actual seller identity and ownership in App Store Connect. Apple does not require every independent student app to use an Organization account merely because it is an app; regulated-service and rights-holder submission rules apply where relevant. No regulated gambling deployment was identified here.
4. Audit the final archived app and its dependency privacy report, configure accurate privacy labels, and test account deletion on an iOS device with a disposable account before submission.

Supabase's security advisor reports the same two pre-existing warnings before and after this change: [pg_net in the public schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The app uses passwordless email OTP. No new advisor findings were introduced; extension relocation should be evaluated separately against the existing scheduled scraper.

The full submission matrix is in `app-store-full-audit.md`. Profile review, private reports, bilateral profile blocks, individual post/venue hiding, restricted operator removal functions and deletion cascades have been deployed and tested. Selected venue posts publish automatically after source/link checks at the owner’s October 10 request. They have no AI or manual caption/image screening; objectionable-content filtering remains a guideline 1.2 release gap. The owner committed to monitoring the inbox and review queue; actual timely moderation and native flows remain release checks.

## Sources and deployment

- [Apple App Review Guidelines, Section 5](https://developer.apple.com/app-store/review/guidelines/#legal)
- [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [Expo configuration](https://docs.expo.dev/versions/v57.0.0/config/app/)
- [Supabase hard deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

Backend project: `ekptnmermhvtrdqpjwwa` (Everything-Laurier). Applied migration: `account_deletion_privacy_guards`; local source: `supabase/schema/account_deletion.sql`. The new `delete-account` function is active. Its gateway `verify_jwt=false` is intentional: the body validates the user's bearer through Supabase Auth and checks `auth.sessions` before using admin credentials, supporting publishable keys and current JWT signing keys. Never remove these checks. Server secrets are provided by the Edge Function runtime only.

## October 16 map/tutoring update

The earlier no-photo/no-location statement above describes the pre-integration app. The current app optionally uses foreground location and selected transcript images. The current policy, permissions, private tutor storage, owner authorization, deletion/retention behavior and verification limits are documented in [integration-verification.md](integration-verification.md). In-app and public policies were updated to version 2026-10-16. Review the actual native archive and final App Store privacy labels before submission.
