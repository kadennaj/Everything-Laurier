export const INSTAGRAM_ACCOUNTS = [
  'rarenightclub',
  'prohibitionwarehouse',
  'thepubonking',
  'kentuckywaterloo',
] as const;

const allowed = new Set<string>(INSTAGRAM_ACCOUNTS);

export type FeedPost = {
  id: string;
  source_username: string;
  post_url: string;
  caption: string;
  image_url: string | null;
  media_type: string;
  posted_at: string;
  synced_at: string;
};

function instagramPostUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
  } catch { return null; }
}

function instagramImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname.endsWith('.cdninstagram.com') || url.hostname.endsWith('.fbcdn.net')) ? value : null;
  } catch { return null; }
}

export function normalizePost(value: unknown, syncedAt: string): FeedPost | null {
  if (!value || typeof value !== 'object') return null;
  const post = value as Record<string, unknown>;
  const source = typeof post.ownerUsername === 'string' ? post.ownerUsername.toLowerCase() : '';
  if (!allowed.has(source)) return null;

  const url = instagramPostUrl(post.url);
  if (!url) return null;
  const id = url.split('/')[4];
  const timestamp = typeof post.timestamp === 'string' ? Date.parse(post.timestamp) : NaN;
  if (!Number.isFinite(timestamp)) return null;

  return {
    id,
    source_username: source,
    post_url: url,
    caption: typeof post.caption === 'string' ? post.caption.trim().slice(0, 3000) : '',
    image_url: instagramImageUrl(post.displayUrl ?? post.thumbnailUrl),
    media_type: typeof post.type === 'string' ? post.type.slice(0, 32) : 'post',
    posted_at: new Date(timestamp).toISOString(),
    synced_at: syncedAt,
  };
}
