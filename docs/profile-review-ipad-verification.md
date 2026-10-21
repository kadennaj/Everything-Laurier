# Profile publication and iPad layout changes — October 21, 2026

Student profile filtering uses human pre-publication review. Every shared profile, including earlier automatic publications, is held as pending until the verified, allowlisted owner checks the name, program, year, introduction and contact email. Private profiles do not enter the queue. No third-party moderation SDK or new screening fee is introduced.

Owner workflow: Profile → Open private review dashboard → Student profiles → Awaiting review → Review profile. Read every field against the community rules, confirm the check, and approve, reject or suspend. Check the queue at least daily and prioritize threats, exploitation and exposed private information. Approval is a human responsibility; the software cannot guarantee that a reviewer recognizes every violation. Students can correct rejected text for another review; suspended profiles require owner intervention and can still be hidden/deleted. Reports, bilateral blocks and support-email appeals remain available.

## Enforcement

The database trigger resets changed profile text/contact/sharing to pending, including direct Data API requests and upserts. An unchanged save preserves a prior decision. Clients have no write permission on moderation status or revision. The owner API locks the row and compares the server-owned revision shown in the review, so a stale approval cannot publish newer text. Verification/opt-in are rechecked before approval. Owner decisions are logged without copying profile text; the profile reference cascades on account deletion. Owner authorization still uses the private allowlist and a live session, never editable user metadata. Existing write/owner request quotas and strict payload validation apply to the added actions.

Migration: `20261021195744_profile_prepublication_review.sql`, applied to the linked project. The old automatic-publication migration/schema recipe is historical; apply migrations in order. `tests/profile-prepublication-review.sql` replaces the former automatic-publication test.

## Layout

Content breakpoints use the measured page width after safe areas, padding and any sidebar. Grids adapt to 1–3 columns, with wider club rows and fewer columns at increased text sizes. Review dialogs scroll, support rotation and avoid the keyboard. Sidebar padding includes the bottom safe area. Existing map camera zoom stays available.

Native iOS 27 testing exposed a launch crash from the old app lifecycle. The official SDK 57 `expo-build-properties` setting `ios.enableSceneSupport: true` fixes the generated project; no generated native sources are checked in or manually patched. Expo 57.0.30 already contains the required runtime. See https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/ . Remove the opt-in when upgrading to an SDK with scene support enabled by default.

## Evidence and limits

- Live transaction-only database tests cover hidden pending/edited profiles, owner-only queues/decisions, blocked self-approval and revision writes, spoofed owner flag, stale decisions, unverified/private approval denial, unchanged upserts, corrected rejected submissions, suspensions, opt-out and bilateral blocking. All fixtures roll back.
- Existing tutor/owner, moderation/report/block and endpoint write protection database suites pass with the new profile publication behavior.
- Security advisors show no new findings. The existing pg_net placement warning and leaked-password protection warning remain documented in endpoint-security.md; private table policies intentionally deny clients.
- The public privacy page was published as Sites version 13 and verified on the custom domain. Canonical Markdown, generated JSON and HTML describe owner screening before profile publication.
- Venue feed publication remains governed by the earlier automatic selected-source import policy. This profile change does not add media screening or claim to close the separate venue-feed filtering release gap.

No App Store upload or approval is implied.

- 71 automated tests, lint, TypeScript checking and static web export pass. Dependency audit remains zero findings after adding the official build-properties plugin.
- Responsive previews checked at 834×1194 portrait, 1194×834 landscape, 1024×768 with sidebar, 507×1024 multitasking and 1366×1024 large iPad sizes. Home, clubs, support, tutoring and map layouts were inspected; large-iPad document width matches viewport width.

- Native iPad Pro 11-inch simulator, iPadOS 27: the scene-enabled build launches, shows campus events, browses multiple clubs, switches from portrait tabs to a landscape sidebar and back, and opens the 3D library indoor map with floor/zoom/directions controls visible. Screenshots: `ipad-review/clubs-portrait.png`, `ipad-review/clubs-landscape.png`, `ipad-review/map-landscape.png`. Initial unsigned simulator keychain errors were resolved for the running test build; no insecure token-storage fallback was added.
- The owner profile decisions were verified through database/API functions with synthetic users. A signed-in owner UI walkthrough and store-signed TestFlight/device tests remain part of release validation; no real student was approved automatically during testing.

- Native guest Profile and centered email sign-in form were inspected on iPad without sending a code or creating an account. Full software-keyboard and signed-in owner form validation remains part of the TestFlight/device pass.
