import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Button, Card, FeedSkeleton, Icon, Pill, SectionTitle, T } from './ui';
import { getInstagramPosts, instagramAccounts, InstagramPost } from '../lib/instagram-feed';
import { useLocal } from '../lib/state';
import { NightlifeAgeGate } from './NightlifeAgeGate';
import { ReportContent } from './ReportContent';
import { colors as c, fonts as f } from '../lib/theme';

const openInstagram = (url: string) => { void Linking.openURL(url); };

function PostCard({ post, compact = false }: { post: InstagramPost; compact?: boolean }) {
  const { hideSource, ready } = useLocal();
  const [imageFailed, setImageFailed] = useState(false);
  const account = instagramAccounts.find(item => item.username === post.source_username);
  const posted = new Date(post.posted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  return <View style={{ flex: 1, gap: 10 }}><Pressable accessibilityRole="link" accessibilityLabel={`Open ${account?.name ?? post.source_username}'s Instagram post from ${posted}`}
    onPress={() => openInstagram(post.post_url)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flex: 1 })}>
    <Card style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
      {post.image_url && !imageFailed ? <Image source={{ uri: post.image_url }} accessibilityLabel="Instagram post preview"
        onError={() => setImageFailed(true)} style={{ width: '100%', aspectRatio: compact ? 1.7 : 1.8, backgroundColor: c.lavender }} resizeMode="cover" /> : null}
      <View style={{ padding: compact ? 18 : 22, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <T style={{ fontFamily: f.bold, fontSize: 16, lineHeight: 23 }}>{account?.name ?? post.source_username}</T>
            <T muted style={{ fontSize: 12 }}>@{post.source_username} · {posted}</T>
          </View>
          <Icon name="instagram" size={19} color={c.purple} />
        </View>
        {!!post.caption?.trim() && <T muted numberOfLines={compact ? 2 : 4} style={{ fontSize: 14, lineHeight: 22 }}>{post.caption.trim()}</T>}
        <T style={{ fontFamily: f.medium, color: c.purple, fontSize: 12 }}>Open on Instagram ↗</T>
      </View>
    </Card>
  </Pressable><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><ReportContent kind="post" target={post.id} /><Button secondary label="Hide this source" icon="eye-off" disabled={!ready} onPress={() => hideSource(post.source_username)} /></View></View>;
}

export function InstagramFeed({ preview = false }: { preview?: boolean }) {
  const { nightlifeAgeConfirmed } = useLocal();
  return nightlifeAgeConfirmed ? <ReviewedInstagramFeed preview={preview} /> : <NightlifeAgeGate />;
}

function ReviewedInstagramFeed({ preview = false }: { preview?: boolean }) {
  const { width } = useWindowDimensions();
  const { hiddenSources } = useLocal();
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError(false);
    try { setPosts(await getInstagramPosts()); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => getInstagramPosts().then(data => { if (active) { setPosts(data); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    void load();
    const interval = setInterval(() => { void load(); }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const previewCardWidth = width >= 1000 ? Math.min(360, (Math.min(width - 312, 1120) - 32) / 3) : Math.min(280, width - 64);
  const visible = (preview || selected === 'all' ? posts : posts.filter(post => post.source_username === selected)).filter(post => !hiddenSources.includes(post.source_username)).slice(0, preview ? 3 : 12);
  const lastSync = posts.reduce((latest, post) => post.synced_at > latest ? post.synced_at : latest, '');
  const updated = lastSync ? new Date(lastSync).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  return <View style={{ gap: 18 }}>
    <SectionTitle title="Latest from the venues" subtitle="Waterloo nightlife, straight from Instagram."
      action={preview ? 'View all' : undefined} onPress={preview ? () => router.push('/nightlife') : undefined} />
    {!preview && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      <Pill label="All venues" active={selected === 'all'} onPress={() => setSelected('all')} />
      {instagramAccounts.map(account => <Pill key={account.username} label={account.name} active={selected === account.username} onPress={() => setSelected(account.username)} />)}
    </ScrollView>}
    {loading && !posts.length ? <FeedSkeleton compact={preview} /> : null}
    {!!visible.length && <>
      {preview ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 8 }}>{visible.map(post => <View key={post.id} style={{ width: previewCardWidth }}><PostCard post={post} compact /></View>)}</ScrollView>
        : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>{visible.map(post => <View key={post.id} style={{ width: width < 680 ? '100%' : '48%', maxWidth: 560 }}><PostCard post={post} /></View>)}</View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {!!updated && <T muted style={{ fontSize: 12 }}>Updated {updated}</T>}
        {!preview && <Button secondary label={loading ? 'Refreshing…' : 'Refresh'} loading={loading} icon="refresh-cw" onPress={() => { void refresh(); }} />}
      </View>
      {error && <T accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>Couldn’t refresh. Showing the last loaded posts.</T>}
    </>}
    {!loading && !visible.length ? <Card style={{ padding: 22, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><Icon name={error ? 'wifi-off' : 'instagram'} color={c.purple} /><View style={{ flex: 1, gap: 6 }}>
        <T accessibilityRole={error ? 'alert' : 'header'} style={{ fontFamily: f.bold, fontSize: 17 }}>{error ? 'Posts couldn’t load' : 'No recent posts'}</T>
        <T muted style={{ fontSize: 14, lineHeight: 22 }}>{error ? 'Try again or visit a venue on Instagram.' : 'New posts appear after review. You can also check the venues on Instagram.'}</T>
      </View></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {instagramAccounts.filter(account => selected === 'all' || selected === account.username).map(account =>
          <Button key={account.username} secondary label={account.name} icon="instagram" onPress={() => openInstagram(`https://www.instagram.com/${account.username}/`)} />)}
      </View>
      <View style={{ alignItems: 'flex-start' }}><Button secondary label={error ? 'Try again' : 'Refresh'} icon="refresh-cw" onPress={() => { void refresh(); }} /></View>
    </Card> : null}
  </View>;
}
