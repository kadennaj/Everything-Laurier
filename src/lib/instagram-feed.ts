import { supabase } from './supabase';

export const instagramAccounts = [
  { username: 'rarenightclub', name: 'Rare Nightclub' },
  { username: 'prohibitionwarehouse', name: 'Prohibition Warehouse' },
  { username: 'thepubonking', name: 'The Pub on King' },
  { username: 'kentuckywaterloo', name: 'Kentucky Waterloo' },
] as const;

export type InstagramPost = {
  id: string;
  source_username: string;
  post_url: string;
  caption: string;
  image_url: string | null;
  media_type: string;
  posted_at: string;
  synced_at: string;
};

export async function getInstagramPosts(): Promise<InstagramPost[]> {
  if (!supabase) throw new Error('Post feed is unavailable.');
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('instagram_feed_posts')
    .select('id,source_username,post_url,caption,image_url,media_type,posted_at,synced_at')
    .gte('posted_at', since).order('posted_at', { ascending: false }).limit(40);
  if (error) throw new Error('Could not load recent posts.');
  return (data ?? []) as InstagramPost[];
}
