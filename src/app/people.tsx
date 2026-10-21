import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';
import { Button, Card, Empty, Icon, PageHeading, Search, T, s } from '../components/ui';
import { useAuth } from '../lib/auth';
import { DirectoryProfile, findStudentProfiles } from '../lib/student-profiles';
import { colors as c, fonts as f } from '../lib/theme';

export default function People() {
  const { session, ready } = useAuth();
  const userId = session?.user.id;
  const { width, fontScale } = useWindowDimensions(); const layoutWidth = width / fontScale;
  const [search, setSearch] = useState('');
  const currentSearch = useRef('');
  const [results, setResults] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const timer = setTimeout(() => {
      void findStudentProfiles(search).then(rows => {
        if (!active) return;
        setResults(rows);
        setHasMore(rows.length === 24);
        setError('');
      }).catch(problem => {
        if (active) setError(problem instanceof Error ? problem.message : 'Please try again.');
      }).finally(() => { if (active) setLoading(false); });
    }, search ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [search, userId, retry]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const requestedSearch = search;
    setLoadingMore(true);
    try {
      const next = await findStudentProfiles(requestedSearch, Math.floor(results.length / 24));
      if (requestedSearch !== currentSearch.current) return;
      setResults(current => [...current, ...next]);
      setHasMore(next.length === 24);
      setError('');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); }
    finally { setLoadingMore(false); }
  }

  if (!ready) return <ActivityIndicator color={c.purple} />;
  if (!session) return <><PageHeading title="People" />
    <Empty title="Sign in to meet students" description="Student profiles are available to people who have verified their email."
      icon="users" action={<Button label="Sign in with email" icon="mail" onPress={() => router.push('/login')} />} /></>;

  return <>
    <PageHeading title="People"
      action={<Button secondary label="Your profile" icon="user" onPress={() => router.push('/profile')} />} />
    <Card style={{ padding: 22, gap: 12 }}>
      <View style={[s.row, { gap: 12 }]}><Icon name="search" color={c.purple} /><T style={{ fontFamily: f.bold, fontSize: 16 }}>Who’s in your program?</T></View>

      <Search value={search} onChange={value => { currentSearch.current = value; setSearch(value); setLoading(true); setResults([]); setHasMore(false); }} placeholder="Search by program…" />
    </Card>
    {loading ? <View style={{ padding: 32, alignItems: 'center', gap: 12 }}><ActivityIndicator color={c.purple} /><T muted>Finding students…</T></View> : <>
      {!!error && <Card style={{ padding: 20, gap: 12 }}><T accessibilityRole="alert" style={{ color: '#8E3434' }}>{error}</T><Button secondary label="Try again" onPress={() => { setLoading(true); setRetry(value => value + 1); }} /></Card>}
      {!error && results.length === 0 && <Empty title="No profiles yet" description={search ? 'Try another program name, or check back as more students join.' : 'Be among the first students to share a profile.'} icon="users" />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{results.map(person => <Card key={person.id} style={{ width: layoutWidth < 700 ? '100%' : undefined, flexBasis: layoutWidth < 700 ? undefined : '30%', flexGrow: 1, maxWidth: layoutWidth < 700 ? undefined : 460 }}>
        <View style={{ height: 48, backgroundColor: c.background }} />
        <View style={{ padding: 22, gap: 13 }}>
          <View style={[s.row, { justifyContent: 'space-between', marginTop: -44 }]}>
            <View style={{ width: 68, height: 68, borderRadius: 23, borderWidth: 4, borderColor: c.surface, backgroundColor: c.peach, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontFamily: f.bold, fontSize: 25, color: c.purple }}>{person.display_name.slice(0, 1).toUpperCase()}</T>
            </View>

          </View>
          <View style={{ gap: 5 }}><T style={{ fontFamily: f.bold, fontSize: 20 }}>{person.display_name}</T><T muted>{person.program}{person.year_label ? ` · ${person.year_label}` : ''}</T></View>
          {!!person.bio && <T muted numberOfLines={3} style={{ lineHeight: 22 }}>{person.bio}</T>}
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${person.display_name}'s profile`} onPress={() => router.push(`/student/${person.id}`)}
            style={[s.row, { justifyContent: 'space-between', minHeight: 46, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 }]}>
            <T style={{ fontFamily: f.bold, color: c.purple }}>View profile</T><Icon name="arrow-right" color={c.purple} size={18} />
          </Pressable>
        </View>
      </Card>)}</View>
      {hasMore && <View style={{ alignItems: 'center' }}><Button secondary label={loadingMore ? 'Loading…' : 'Show more students'} disabled={loadingMore} onPress={() => { void loadMore(); }} /></View>}
    </>}
  </>;
}
