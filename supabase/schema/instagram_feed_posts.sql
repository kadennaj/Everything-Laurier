-- Recent public venue posts. Only the server-side sync function can write rows.
create table if not exists public.instagram_feed_posts (
  id text primary key,
  source_username text not null check (source_username in (
    'rarenightclub', 'prohibitionwarehouse', 'thepubonking', 'kentuckywaterloo'
  )),
  post_url text not null,
  caption text not null default '',
  image_url text,
  media_type text not null default 'post',
  posted_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists instagram_feed_posts_recent_idx
  on public.instagram_feed_posts (posted_at desc);

alter table public.instagram_feed_posts enable row level security;

create policy "Anyone can read venue posts"
  on public.instagram_feed_posts for select
  to anon, authenticated
  using (true);

grant select on public.instagram_feed_posts to anon, authenticated;
revoke insert, update, delete on public.instagram_feed_posts from anon, authenticated;
