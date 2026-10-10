# Everything Laurier moderation operations

Owner confirmed October 9, 2026 that they will monitor everythinglaurier@gmail.com and regularly review content. Check the private queue at least daily; prioritize threats, exploitation and exposed private information immediately when seen. This is an operating procedure, not evidence that a response has already occurred. Keep the contact functioning and test it before submission.

New and changed profiles and imported posts are held pending. Existing content was also placed pending when the safeguard was introduced. Do not bulk-approve unseen content. Inspect every profile field and each post caption, image/video content, source, URL and rights before approval. If media cannot be inspected or publication rights are uncertain, leave it pending or reject it. Images may change at the source: revoke approval if the content no longer matches the reviewed material.

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

Release requires proof the queue/contact are operated, venue/media permission and review of the initially pending content, plus native account/report/block/deletion tests.
