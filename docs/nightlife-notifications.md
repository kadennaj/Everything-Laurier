# Venue notifications

The Expo project is @everythinglauriers-team/everythinglaurier (8417e84b-0ac0-4c27-b37d-227633550ba7). Apple signing and APNs belong to team JRCUQ9JQW6, using the developer account everythinglaurier@gmail.com. Keys remain in EAS; the app contains no server secret.

## User flow

Nightlife → Venue notifications, or Profile → Notifications. Sign in, accept account terms, confirm 19+, choose venues, then explicitly enable device notifications. No prompt appears on first launch. Rare Nightclub, Prohibition Warehouse, The Pub on King and Kentucky Waterloo correspond to the existing imported feed accounts. Alerts are generic and open the chosen venue’s feed through validated internal routing. Captions, images, profile data and location are excluded.

Users can update venues, turn alerts off across devices, or revoke operating-system permission. Foreground checks quietly refresh an already permitted token and unregister a denied device. Sign-out unregisters the session; session/account deletion cascades stored devices. Data exports include choices and device registration metadata, excluding raw tokens/session IDs.

## Delivery and limits

Only newly published approved posts within 24 hours are enqueued. Existing historical posts do not create alerts. Imports currently run every eight hours; delivery is not immediate Instagram monitoring. New notification jobs do not increase scraping frequency or its provider budget.

The database enforces a maximum of 5 devices/account, 6 attempted alerts/device/UTC day, 5,000 attempts/service/UTC day, a batch of 50 and unique post/device deliveries. Preferences/device writes require a live session; enabling also requires stored account terms and age confirmations. Private tables deny client access. Owner-only status is available through nightlife_notifications/owner_status; it exposes counts, never tokens.

The Edge worker checks a scheduler-secret SHA-256 digest before database access; SQL validates the same credential and service role. Vault holds the actual scheduler credential. If rotating it, update the server-only digest in the worker and the private settings hash together; never put the secret in source or app configuration. Provider URLs are fixed. Attempts are recorded before sends; ambiguous timeouts are not resent. Expo receipts are checked for delivery errors, and DeviceNotRegistered removes a token. Provider handoff is not proof that a person viewed an alert.

Records expire after seven days and inactive devices after 60 days through daily cleanup. The dispatcher cron starts paused and global delivery starts disabled, pending a signed physical-device test. To pause a live system, set private.nightlife_push_settings.enabled=false and pause dispatch-nightlife-notifications in cron. Keep cleanup active.

## Verification

79 automated tests pass, including notification payload routing, authorization-before-network, disabled dispatch, generic message content, provider failures and receipts. Rollback-only live SQL tests pass for account isolation, private-table/function denials, source/age validation, duplicate prevention, old/unselected/held posts, per-device/global caps, export redaction, unsubscribe and session/account deletion. The deployed dispatcher rejects unauthenticated requests (401), and an authenticated Vault-backed invocation while paused returned 200 with zero attempts. No real venue post was created for tests.

Current dependency audit: 27 findings (2 high, 23 moderate, 2 low), including upstream Zod build-tool and glob/matcher advisories. These are not cleared by the UI/notification work; avoid a forced Expo downgrade. Previously patched braces/node-forge/URI decoder regressions remain covered.

The local iPad simulator build was stopped when the Mac ran out of free disk space (libtool errno 28); only its generated /tmp build directory was removed. Native iPad verification of this revision is incomplete. Responsive browser layouts were inspected at phone/tablet widths. Expo dependency alignment pins react-native-worklets 0.10.1 and react-native-reanimated 4.5.1; a clean npm 10 install dry-run passes after resolving the initial EAS lockfile/peer mismatch.

## Signed iPhone preview

EAS build ad794f1f-56a2-4b3b-b0fa-c9b048a19893 finished successfully. Its signature verifies, with production APNs entitlement, Apple team JRCUQ9JQW6, iPad device-family support and scene support. iOS rejected an in-place upgrade across the old personal team WXAN8479VC; after the operator explicitly approved replacing the old app and resetting local choices, the app was removed, installed and launched successfully on the connected iPhone 15. Server-side registration is temporarily available for the owner’s test; scheduled delivery remains paused pending confirmation.

Token registration now serializes by user and token and repeats ownership checks in the conflict update. Rollback-only SQL tests also verify idempotent refresh registration; no token can move between accounts through a competing upsert.
