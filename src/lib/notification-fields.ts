export const notificationVenues = [
  { username: 'rarenightclub', name: 'Rare Nightclub' },
  { username: 'prohibitionwarehouse', name: 'Prohibition Warehouse' },
  { username: 'thepubonking', name: 'The Pub on King' },
  { username: 'kentuckywaterloo', name: 'Kentucky Waterloo' },
] as const;
export function notificationSource(value: unknown): string | null {
  return typeof value === 'string' && notificationVenues.some(v => v.username === value) ? value : null;
}
export function notificationTarget(data: unknown): { pathname: '/nightlife'; params: { source: string } } | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  const source = notificationSource(value.source);
  return value.type === 'nightlife-post' && source && typeof value.postId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value.postId)
    ? { pathname: '/nightlife', params: { source } } : null;
}
