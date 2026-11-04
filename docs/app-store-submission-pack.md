# App Store submission — November 3, 2026

Status: preparation in App Store Connect; not submitted or live. Apple Developer membership and agreements are active. App ID 6830356811, bundle ca.everythinglaurier.preview, version 1.0.0, Apple team JRCUQ9JQW6. The initial release is free, Canada first, iPhone and iPad. Public listing text is in release/app-store-listing.json. Private contact details and credentials must never be committed.

## Content and review access

Student profiles, tutor applications and new/edited venue posts require owner approval before discovery/publication. The venue queue checks revisions and preserves rejections during imports. Inspect captions and all original media before approval. Owner operation and support remain ongoing duties; synthetic tests do not establish human review. See moderation-operations.md.

Apple has a separate confirmed account, everythinglaurier+appreview@gmail.com, with a unique owner-entered password and no owner privileges. The password is provided only in Apple's private Review Information. Enter this exact email on Sign in to reveal the password field, enter the supplied password, then complete the request-only Turnstile check and sign in. This uses normal Supabase authentication with CAPTCHA; no universal code or authentication bypass exists. Ordinary accounts use requested email codes. Backend services must remain available during review.

Review notes should explain guest browsing, optional 16+ account consent, 19+ nightlife acknowledgement, private-by-default profiles and moderation, transcript handling, optional location, and calibrated floor estimates. Do not claim automatic indoor room/floor tracking. No paid features or in-app purchases exist; tutor rates describe external peer services. No university affiliation is claimed.

## Verification completed

- 90 automated tests pass, including review login validation and safe venue media links.
- Lint and TypeScript checks pass; Expo Doctor 21/21.
- Rollback-only database tests pass for venue review, notification delivery limits, and student-profile review. Post-deployment venue checks pass. Non-owners cannot access review tools; new imports are pending, edited posts need renewed review, and stale decisions fail.
- Reviewer account is confirmed, has a password, and has no owner grant. Its password was not retrieved.
- Previous paid-team iPhone preview: welcome/sign-in, venue alert opt-in and push receipt/feed opening were confirmed by the owner. Prior phone location/floor calibration and map-only zoom were confirmed.
- npm dependency audit has no critical or high findings; 24 moderate and 2 low build-tool findings remain. See dependency-security.md.
- Public privacy notice now describes venue approval and dedicated reviewer authentication, with effective date 2026-11-03.

## Still required before submission

- Store build2 has finished and uploaded successfully. Select the processed build in App Store Connect. See release-verification-2026-11-03.md.
- Genuine final native iPhone and 13-inch iPad screenshots and runtime layout checks.
- Actual reviewer password sign-in check and private review credentials entered by the owner.
- Complete App Store privacy labels, content-rights declaration, free Canada availability and remaining required fields. Apple's calculated rating is 18+ (older operating systems 17+); nightlife remains 19+ in app.
- Reconcile final bundled privacy manifests and SDK/provider data handling with store labels.
- Check final native account/report/block/deletion and accessibility flows; do not claim untested accessibility support or native results.
- Apple App Review approval is required before public availability. Uploading to TestFlight is not public submission or release.
