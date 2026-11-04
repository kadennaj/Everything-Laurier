export type VenueReviewPost = { id: string; source_username: string; caption: string; image_url: string | null; post_url: string; media_type: string; posted_at: string; moderation_status: 'pending' | 'approved' | 'rejected'; moderation_revision: number };
export function venueReviewLinks(post: Pick<VenueReviewPost, 'id' | 'post_url' | 'image_url'>) {
  const postUrl = /^[A-Za-z0-9_-]{1,128}$/.test(post.id) && new RegExp('^https://www[.]instagram[.]com/(p|reel)/' + post.id + '/$').test(post.post_url) ? post.post_url : null;
  let imageUrl: string | null = null;
  try { const u = new URL(post.image_url ?? ''); if (u.protocol === 'https:' && !u.username && !u.password && (u.hostname.endsWith('.cdninstagram.com') || u.hostname.endsWith('.fbcdn.net'))) imageUrl = u.href; } catch { /* Untrusted pending links stay closed. */ }
  return { postUrl, imageUrl };
}
