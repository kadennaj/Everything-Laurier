import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Button, Card, Icon, Pill, SectionTitle, T } from './ui';
import { getInstagramPosts, instagramAccounts, InstagramPost } from '../lib/instagram-feed';
import { colors as c, fonts as f } from '../lib/theme';

const openInstagram = (url: string) => { void Linking.openURL(url); };

function PostCard({ post }: { post: InstagramPost }) {
  const [imageFailed, setImageFailed] = useState(false);
  const account = instagramAccounts.find(item => item.username === post.source_username);
  const posted = new Date(post.posted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  return <Pressable accessibilityRole="link" accessibilityLabel={`Open ${account?.name ?? post.source_username}'s Instagram post from ${posted}`}
    onPress={() => openInstagram(post.post_url)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flex: 1 })}>
    <Card style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
      {post.image_url && !imageFailed ? <Image source={{ uri: post.image_url }} accessibilityLabel="Instagram post preview"
        onError={() => setImageFailed(true)} style={{ width: '100%', height: 240, backgroundColor: c.lavender }} resizeMode="cover" /> : null}
      <View style={{ padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <T style={{ fontFamily: f.bold, fontSize: 15 }}>{account?.name ?? post.source_username}</T>
            <T muted style={{ fontSize: 12 }}>@{post.source_username} · {posted}</T>
          </View>
          <Icon name="instagram" size={19} color={c.purple} />
        </View>
        <T numberOfLines={5} style={{ fontSize: 14, lineHeight: 21 }}>{post.caption || 'See the latest post on Instagram.'}</T>
        <T style={{ fontFamily: f.bold, color: c.purple, fontSize: 13 }}>View post on Instagram ↗</T>
      </View>
    </Card>
  </Pressable>;
}

export function InstagramFeed({ preview = false }: { preview?: boolean }) {
  const { width } = useWindowDimensions();
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

  const visible = (preview || selected === 'all' ? posts : posts.filter(post => post.source_username === selected)).slice(0, preview ? 2 : 12);
  const lastSync = posts.reduce((latest, post) => post.synced_at > latest ? post.synced_at : latest, '');
  const updated = lastSync ? new Date(lastSync).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  return <View style={{ gap: 17 }}>
    <SectionTitle title="Fresh from the venues." subtitle="Real posts from Waterloo nightlife. Check the venue for current details."
      action={preview ? 'Nightlife' : undefined} onPress={preview ? () => router.push('/nightlife') : undefined} />
    {!preview && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingRight: 14 }}>
      <Pill label="All four" active={selected === 'all'} onPress={() => setSelected('all')} />
      {instagramAccounts.map(account => <Pill key={account.username} label={account.name} active={selected === account.username} onPress={() => setSelected(account.username)} />)}
    </ScrollView>}
    {loading ? <View style={{ padding: 28, alignItems: 'center', gap: 10 }}><ActivityIndicator color={c.purple} /><T muted>Checking recent posts…</T></View> : null}
    {!loading && !!visible.length ? <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <T muted style={{ fontSize: 12 }}>Post previews updated {updated}</T>
        <Button secondary label="Refresh" icon="refresh-cw" onPress={() => { void refresh(); }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
        {visible.map(post => <View key={post.id} style={{ width: width < 680 ? '100%' : '48%', maxWidth: 560 }}><PostCard post={post} /></View>)}
      </View>
    </> : null}
    {!loading && !visible.length ? <Card style={{ gap: 13 }}>
      <T style={{ fontFamily: f.bold, fontSize: 17 }}>{error ? 'Recent posts could not load.' : 'No recent posts to show yet.'}</T>
      <T muted style={{ lineHeight: 22 }}>Recent posts will appear here as venues publish them. You can check each venue directly on Instagram.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {instagramAccounts.filter(account => selected === 'all' || selected === account.username).map(account =>
          <Button key={account.username} secondary label={account.name} icon="instagram" onPress={() => openInstagram(`https://www.instagram.com/${account.username}/`)} />)}
      </View>
      <View style={{ alignItems: 'flex-start' }}><Button label="Try again" icon="refresh-cw" onPress={() => { void refresh(); }} /></View>
    </Card> : null}
  </View>;
}
