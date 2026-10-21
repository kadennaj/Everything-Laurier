import { gridItemStyle } from '../lib/layout';
import { useContentLayout } from '../lib/use-content-layout';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { InstagramFeed } from '../components/InstagramFeed';
import { Button, Card, Chips, Empty, Eyebrow, Icon, IconName, SectionTitle, T, s } from '../components/ui';
import { CalendarStatus } from '../components/CalendarStatus';
import { clubs } from '../data/content';
import { useOfficialEvents } from '../lib/official-events';
import { useLocal } from '../lib/state';
import { colors as c, fonts as f, radii } from '../lib/theme';

export default function Discover() {
  const { width, fontScale } = useContentLayout();
  const compact = width / fontScale < 700;
  const singleColumn = width / fontScale < 330;
  const [filter, setFilter] = useState('Upcoming');
  const { saved } = useLocal();
  const { events, loading, error, now } = useOfficialEvents();
  const [limit, setLimit] = useState(3);
  const candidates = filter === 'Saved' ? events.filter(event => saved.includes(`event:${event.id}`)) : events.filter(event => Date.parse(event.endsAt) >= now);
  const featuredClubs = ['laurier-computing-society-lcs', 'laurier-outdoors-club'].map(id => clubs.find(club => club.id === id)).filter(club => !!club);
  const shortcuts: { label: string; sub: string; icon: IconName; path: '/map' | '/help' | '/people' | '/saved' }[] = [
    { label: 'Find a room', sub: 'Campus & indoor maps', icon: 'map', path: '/map' },
    { label: 'Academic help', sub: 'Support & peer tutors', icon: 'book-open', path: '/help' },
    { label: 'Meet people', sub: 'Your campus community', icon: 'users', path: '/people' },
    { label: 'Saved items', sub: saved.length ? `${saved.length} kept for later` : 'Your places & plans', icon: 'bookmark', path: '/saved' },
  ];
  return <>
    <View style={{ gap: 9 }}><Eyebrow>WATERLOO CAMPUS</Eyebrow><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: compact ? 30 : 36, lineHeight: compact ? 38 : 44, letterSpacing: -0.6 }}>Your campus</T></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Search rooms, buildings, clubs and events" onPress={() => router.push('/search')} style={({ pressed }) => [s.row, { minHeight: 60, padding: 17, gap: 13, borderRadius: radii.control, backgroundColor: pressed ? c.pressed : c.surface, borderWidth: 1, borderColor: c.border }]}>
      <Icon name="search" color={c.purple} /><T muted style={{ flex: 1, fontSize: 17, lineHeight: 24 }}>Search rooms, clubs, events…</T><Icon name="chevron-right" color={c.muted} size={18} />
    </Pressable>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{shortcuts.map((item, index) => <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={item.label} accessibilityHint={item.sub} onPress={() => router.push(item.path)} style={({ pressed }) => ({ flexBasis: singleColumn ? '100%' : compact ? '46%' : '22%', flexGrow: 1, minHeight: 128, borderWidth: 1, borderColor: index === 0 ? '#D7C9E9' : c.border, borderRadius: 20, padding: 18, backgroundColor: pressed ? c.pressed : index === 0 ? c.lavender : c.surface, gap: 14 })}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><Icon name={item.icon} size={24} color={c.purple} /><Icon name="chevron-right" size={16} color={c.muted} /></View><View style={{ gap: 5 }}><T style={{ fontFamily: f.bold, fontSize: 17, lineHeight: 23 }}>{item.label}</T><T muted style={{ fontSize: 14, lineHeight: 21 }}>{item.sub}</T></View>
    </Pressable>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${clubs.length} clubs and communities`} onPress={() => router.push('/clubs')} style={({ pressed }) => ({ minHeight: 184, borderRadius: radii.hero, overflow: 'hidden', backgroundColor: c.purpleDark, opacity: pressed ? 0.85 : 1 })}>
      <Image source={require('../../assets/images/campus.jpg')} accessible={false} style={{ position: 'absolute', right: 0, width: '100%', height: '100%' }} resizeMode="cover" />
      <LinearGradient colors={['#292136F5', '#292136DD', '#292136CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ padding: compact ? 24 : 30, gap: 10, alignItems: 'flex-start' }}><T style={{ fontFamily: f.bold, color: c.surface, fontSize: 27, lineHeight: 35, letterSpacing: -0.4 }}>Explore clubs</T><View style={[s.row, { gap: 12, flexWrap: 'wrap' }]}><T style={{ color: c.surface, fontSize: 16, lineHeight: 24 }}>Explore {clubs.length} clubs & communities</T><Icon name="arrow-right" size={20} color={c.surface} /></View></View>
    </Pressable>
    <View style={{ gap: 18 }}>
      <SectionTitle title="Around campus" subtitle="Events from Laurier’s official calendar." />
      <Chips items={['Upcoming', 'Saved']} value={filter} onChange={value => { setFilter(value); setLimit(3); }} />
      {candidates.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{candidates.slice(0, limit).map(event => <View key={event.id} style={gridItemStyle(width, fontScale)}><EventCard event={event} /></View>)}</View>}
      {!candidates.length && !loading && !error && <Card><Empty title={filter === 'Saved' ? 'Keep your next plan here' : 'No upcoming campus events'} icon="calendar" description={filter === 'Saved' ? 'Tap the bookmark on an event to save it for later.' : 'New events appear when Laurier publishes them.'} /></Card>}
      {candidates.length > limit && <Button secondary label="Show more events" onPress={() => setLimit(value => value + 6)} />}
      <CalendarStatus />
    </View>
    <InstagramFeed preview />
    <View style={{ gap: 18 }}><SectionTitle title="Clubs for you" action="All clubs" onPress={() => router.push('/clubs')} /><View style={{ flexDirection: compact ? 'column' : 'row', gap: 16 }}>{featuredClubs.map(club => <View key={club.id} style={{ flex: 1 }}><ClubCard club={club} /></View>)}</View></View>
  </>;
}
