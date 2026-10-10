// Apply personal feed choices before pagination so hidden posts do not consume slots.
export function visibleFeedPosts<T extends { id: string; source_username: string }>(
  posts: T[], selected: string, hiddenSources: string[], hiddenPosts: string[], limit: number,
): T[] {
  const sources = new Set(hiddenSources);
  const hidden = new Set(hiddenPosts);
  return posts.filter(post => (selected === 'all' || post.source_username === selected)
    && !sources.has(post.source_username) && !hidden.has(post.id)).slice(0, limit);
}
