# Tutoring and owner dashboard

Implemented October 16, 2026 on `feature/map-tutoring-owner-dashboard`.

## Operator access

Sign in with **everythinglaurier@gmail.com**, then open **Your space → Open private review dashboard**, or navigate to `/owner`. The owner allowlist is in `private.app_owners`, tied to the existing verified Auth user ID. A client-supplied email, user metadata flag, URL, or role cannot grant owner access. The current browser account is a different account and is intentionally denied. Do not change the allowlist to make a test account an owner.

Database administrators can maintain the allowlist in Supabase SQL Editor; the app cannot. If the owner account is deleted, its allowlist entry is deleted too. Recreating an account with the same email does not automatically restore owner privileges; a database administrator must verify and grant the new ID. No service key belongs in the app.

## Applicant flow

Academic help → Tutoring support provides **Find a tutor**, **Become a tutor**, and **My applications**. One course per application; the verified account supplies the contact email. A short form asks about course completion, tutoring approach, optional experience, availability and rate. The applicant chooses a cropped/redacted image showing their name and the specific course. The app re-encodes it as JPEG and limits uploads to 8 MB.

The database reserves a private path for a draft. Storage allows an authenticated applicant to create only their own reserved draft file, without overwriting submitted evidence. Submission requires the image to exist and moves the draft to pending. Failed uploads can be retried; abandoned drafts can be discarded. There is a limit of five creations per hour and ten active courses per user. Consent is versioned and mandatory before submission.

A public directory read exposes only manually approved, expressly consented fields to signed-in users: name, verified email, course, approach, availability and rate. A transcript, completed term, experience answer, application owner ID, and review note are not directory fields. This is an independent peer tutoring directory, not a guarantee of teaching quality, current enrolment, or university endorsement. Payments and scheduling are external.

## Reviewing applications

Open a pending application, load its transcript securely, inspect the name/course/term/completion, and confirm the evidence was checked. Signed image URLs last 60 seconds and the modal clears them when closed or expired. Approve only after manual review. Rejection notes are visible privately to the applicant. An approved listing can later be removed. Stale or withdrawn application decisions are rejected by the server. Filters and pagination separate pending, approved and rejected records.

Transcripts are never a public bucket or public URL. Treat them as sensitive educational records: do not copy them into email, chats, screenshots, logs, or public issue trackers. Infrastructure administrators retain their necessary administrative access; the client cannot promise otherwise.

## Reviewing content reports

The dashboard shows reported profiles, venue posts and tutor listings, selected reasons, timestamps and current content. Choose **remove/restrict and resolve**, **resolve and keep**, or **dismiss**, then confirm the decision. Removing a profile suspends it and prevents self-publication through edits. Removing a venue post rejects it and survives importer updates. Removing a tutor listing rejects the listing. The content decision, report resolution and review log are atomic.

No actual user's application or complaint was approved/rejected during implementation. The database integration tests use synthetic fixtures inside a transaction that rolls back. Browser testing verified a normal signed-in account is denied owner access; an actual owner sign-in is needed to inspect the real dashboard interactively.

## Retention and deletion

`tutor-transcripts` is private, JPEG-only, 8 MB maximum. Daily `tutor-storage-cleanup` removes reviewed images after 30 days, pending images after 90 days, abandoned drafts after one day, and withdrawn/orphaned files. It uses the Storage API, not direct deletion of storage metadata. A separate daily database job expires evidence-free pending applications and deletes stale draft, rejected and withdrawn records. Withdrawal immediately unlists an application and attempts image removal; scheduled cleanup retries failures. Approved listing records can outlive the image while active.

Account deletion revokes sessions, enumerates that verified user's files through a service-only function, removes them through the Storage API, and then deletes the Auth account. Foreign keys remove applications/listings and linked records. Cleanup errors fail closed without falsely reporting deletion success; the user can sign in and retry.

The cleanup function validates a server-only Vault token by SHA-256, matching the existing scheduled sync approach. Its `verify_jwt=false` gateway flag does not mean an unauthenticated endpoint. Requests without the correct token return 401. `delete-account` separately verifies the user's bearer with Auth and checks a live database session before using server credentials.

Backend project: `ekptnmermhvtrdqpjwwa`. Final schema source: `supabase/schema/tutoring_owner_portal.sql`; incremental migrations are under `supabase/migrations`. Do not apply the combined schema again to an already migrated database. Run `tests/tutoring-owner-rls.sql` through an administrator connection only; its fixtures are rolled back.
