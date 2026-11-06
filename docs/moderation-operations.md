> November 6, 2026: At the operator’s request, selected venue posts now publish automatically after source/link checks. This supersedes the November 3 prepublication workflow below for venue posts only. These checks do not screen captions or images. Reports, hiding and owner removal remain; removed posts stay removed. Student-profile and tutor approval are unchanged. Existing posts were released without historical push alerts.

# Everything Laurier moderation operations

Owner confirmed October 9, 2026 that they will monitor everythinglaurier@gmail.com and regularly review content. Check the private queue at least daily; prioritize threats, exploitation and exposed private information immediately when seen. This is an operating procedure, not evidence that a response has already occurred. Keep the contact functioning and test it before submission.

October 21 supersedes the former automatic student-profile publication: shared profiles and edits now require owner review before other students can read them. Existing automatic publications were returned to the pending queue. Use Profile → private review dashboard → Student profiles. See [profile-review-ipad-verification.md](profile-review-ipad-verification.md) for revision checks, appeals and verification. November 3 supersedes automatic venue publication: all new imports and content changes now require owner review. Previously published posts were held pending for review. Open Profile → private review dashboard → Venue posts. Inspect the complete caption and all original media, including each item in a carousel or video, before checking the inspection confirmation and approving. Reject content that violates the community rules or cannot be inspected. No AI provider or moderation fee is introduced.

The queue includes pending, approved and rejected posts. Every decision checks the post revision so a changed post cannot be approved using an old review. A content edit returns an approved post to pending; rejected posts remain rejected across imports. Owner decisions record actor, post and time privately. Source/link checks do not screen objectionable content or establish media rights. Personal Hide post and Hide venue controls affect only that device; they do not resolve reports or remove content for everyone. Notification alerts only follow approved posts, subject to opt-in, freshness and delivery limits.

Inspect profile fields before approval. Check reports and published content regularly, remove inappropriate posts, and apply the same community rules consistently. An implemented review queue does not establish that the operator has actually inspected content or that every release requirement is satisfied.

Use your already-authorized Supabase dashboard → SQL Editor, as the database administrator. These operations are deliberately unavailable to app users. Never copy a service-role key into the app or publish private reports. The app can still delete an account that has a suspended profile.

Pending content and open reports:

```sql
select id, display_name, program, year_label, bio, moderation_status
from public.student_profiles where is_discoverable and moderation_status='pending' order by updated_at;
select id, source_username, caption, image_url, post_url, media_type
from public.instagram_feed_posts where moderation_status='pending' order by posted_at desc;
select id, profile_id, post_id, reason, created_at
from private.content_reports where status='open' order by created_at;
```

For a **single inspected item**, replace the placeholder with its exact ID. The SQL Editor validates the ID; the app cannot invoke these functions.

```sql
select private.review_profile('PROFILE_UUID', 'approved'); -- or rejected / suspended
select private.review_post('POST_ID', 'approved'); -- or rejected
select private.resolve_content_report('REPORT_UUID', 'resolved'); -- or dismissed
```

Rejecting removes a profile/post from future reads. Suspending a profile removes its public visibility and stops the owner editing that profile until an administrator reviews it. Blocks hide the two users from each other's directory queries and detailed profile routes. Blocking cannot stop external email once an address has already been shared.

Investigate reports, apply the appropriate content decision, and resolve or dismiss the report only after the review. Record operator review evidence separately with access limited to the operator; do not retain unnecessary copies of deleted personal content. Reply to support-email concerns through your inbox. Do not promise a resolution before investigating. Explain moderation decisions when a user asks; allow appeals through the support address.

Account deletion cascades to all associated moderation reports and profile blocks, including blocks targeting the deleted account. Do not restore deleted users during a backup restore. Verify deletion handling before making any recovery public.

Release requires proof the queue/contact are operated, venue/media permission, profile removal/report operations and operation of the profile review queue and operation of the venue review queue, plus native account/report/block/hide/deletion tests.

## Owner dashboard (October 16)

The designated verified operator can now use `/owner` after signing in as `everythinglaurier@gmail.com`; ordinary users are denied by server-side authorization. Review reported profiles/posts/tutor listings and confirm removal/restriction plus resolution, resolution without removal, or dismissal. The older database-only workflow remains an administrator recovery option. See [tutoring-owner-dashboard.md](tutoring-owner-dashboard.md) for the allowlist, private transcript handling, review steps and retention. Do not distribute service credentials to use this dashboard.
