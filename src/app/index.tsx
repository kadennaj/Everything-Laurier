import { gridItemStyle } from '../lib/layout';
import { useContentLayout } from '../lib/use-content-layout';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { InstagramFeed } from '../components/InstagramFeed';
import { Button, Card, Chips, Empty, Icon, IconName, SectionTitle, T, s } from '../components/ui';
import { CalendarStatus } from '../components/CalendarStatus';
import { clubs } from '../data/content';
import { useOfficialEvents } from '../lib/official-events';
import { useLocal } from '../lib/state';
import { colors as c, radii } from '../lib/theme';

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
    <View style={{ minHeight: compact ? 360 : 440, borderRadius: radii.hero, overflow: 'hidden', backgroundColor: c.purpleDark, justifyContent: 'flex-end' }}>
      <Image source={require('../../assets/images/campus.jpg')} accessible={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} resizeMode="cover" />
      <LinearGradient colors={['#10101420', '#101014D9']} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ padding: compact ? 28 : 44, gap: 18, alignItems: 'flex-start' }}>
        <T style={{ color: '#FFFFFF', fontWeight: '500', fontSize: 15 }}>LAURIER WATERLOO</T>
        <T accessibilityRole="header" style={{ color: '#FFFFFF', fontWeight: '700', fontSize: compact ? 44 : 66, lineHeight: compact ? 48 : 70, letterSpacing: -1.8 }}>Your campus.{'\n'}Made simple.</T>
        <T style={{ color: '#FFFFFF', fontSize: 18, lineHeight: 27 }}>Rooms, clubs and what’s next.</T>
        <Button label="Explore the map" icon="arrow-up-right" onPress={() => router.push('/map')} style={{ backgroundColor: c.purple }} />
      </View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Search rooms, buildings, clubs and events" onPress={() => router.push('/search')} style={({ pressed }) => [s.row, { minHeight: 58, padding: 18, gap: 12, borderRadius: 18, backgroundColor: pressed ? c.pressed : c.surface }]}>
      <Icon name="search" color={c.muted} /><T muted style={{ flex: 1, fontSize: 17 }}>Search campus</T><Icon name="chevron-right" color={c.muted} size={18} />
    </Pressable>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{shortcuts.map(item => <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={item.label} accessibilityHint={item.sub} onPress={() => router.push(item.path)} style={({ pressed }) => ({ flexBasis: singleColumn ? '100%' : compact ? '46%' : '22%', flexGrow: 1, minHeight: 110, padding: 18, borderRadius: 22, backgroundColor: pressed ? c.pressed : c.surface, gap: 14 })}>
      <Icon name={item.icon} size={25} color={c.purple} /><T style={{ fontWeight: '600', fontSize: 17 }}>{item.label}</T>
    </Pressable>)}</View>
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
