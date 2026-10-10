import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { InstagramFeed } from '../components/InstagramFeed';
import { Card, Chips, Empty, ExternalButton, Icon, IconName, SectionTitle, T, s } from '../components/ui';
import { clubs, events } from '../data/content';
import { useLocal } from '../lib/state';
import { colors as c, fonts as f, radii } from '../lib/theme';

export default function Discover() {
  const { width } = useWindowDimensions(); const compact = width < 650; const desktop = width >= 1000;
  const [filter, setFilter] = useState('For you'); const { saved } = useLocal();
  const visible = filter === 'Saved' ? events.filter(e => saved.includes(`event:${e.id}`)) : events.filter(e => e.category !== 'Nightlife').slice(0, 3);
  const featuredClubs = ['laurier-computing-society-lcs', 'laurier-outdoors-club'].map(id => clubs.find(club => club.id === id)).filter(club => !!club);
  const shortcuts: { label: string; sub: string; icon: IconName; path: '/clubs' | '/map' | '/people' | '/help' }[] = [
    { label: 'Clubs', sub: 'Find your community', icon: 'users', path: '/clubs' },
    { label: 'Campus map', sub: 'Find your way', icon: 'map', path: '/map' },
    { label: 'People', sub: 'Make a connection', icon: 'coffee', path: '/people' },
    { label: 'Academic help', sub: 'A little support', icon: 'book-open', path: '/help' },
  ];
  return <>
    <View style={{ gap: 6 }}><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: compact ? 29 : 36, lineHeight: compact ? 38 : 44, letterSpacing: -0.4 }}>Make campus yours.</T><T muted style={{ fontSize: 15 }}>Your guide to life at Laurier.</T></View>
    <View style={{ minHeight: compact ? 244 : 288, borderRadius: radii.hero, overflow: 'hidden', backgroundColor: c.purpleDark }}>
      <Image source={require('../../assets/images/campus.jpg')} accessibilityLabel="Schlegel Centre at Laurier Waterloo, photographed by LeonV" style={{ position: 'absolute', right: 0, width: compact ? '100%' : '70%', height: '100%' }} resizeMode="cover" />
      <LinearGradient colors={compact ? ['#292136DD', '#29213688'] : ['#292136', '#292136E6', '#29213610']} locations={compact ? [0, 1] : [0, 0.38, 1]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ padding: compact ? 24 : 36, gap: 18, alignItems: 'flex-start', maxWidth: compact ? undefined : 560 }}>
        <T style={{ fontSize: 12, fontFamily: f.medium, color: c.gold }}>Discover your community</T>
        <T accessibilityRole="header" style={{ fontFamily: f.bold, color: c.surface, fontSize: compact ? 30 : 41, lineHeight: compact ? 39 : 50, letterSpacing: -0.4 }}>Good people.{'\n'}Great possibilities.</T>
        <T style={{ color: '#F1EAF5', fontSize: 14, lineHeight: 22 }}>Explore {clubs.length} clubs. Find your people.</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/clubs')} style={({ pressed }) => [s.row, { backgroundColor: c.surface, borderRadius: radii.control, paddingVertical: 13, paddingHorizontal: 18, gap: 16, minHeight: 48, opacity: pressed ? 0.8 : 1 }]}><T style={{ fontFamily: f.medium, fontSize: 14, color: c.purpleDark }}>Explore clubs</T><Icon name="arrow-right" size={17} color={c.purpleDark} /></Pressable>
      </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{shortcuts.map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push(item.path)} style={({ pressed }) => ({ flexBasis: compact ? '46%' : '22%', flexGrow: 1, minHeight: 112, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 16, backgroundColor: pressed ? c.pressed : c.surface, gap: 12 })}>
      <Icon name={item.icon} size={22} color={c.purple} /><View style={{ gap: 3 }}><T style={{ fontFamily: f.medium, fontSize: 14 }}>{item.label}</T><T muted style={{ fontSize: 12, lineHeight: 18 }}>{item.sub}</T></View>
    </Pressable>)}</View>
    <InstagramFeed preview />
    <View style={{ gap: 18 }}>
      <SectionTitle title="Around campus" subtitle="Ideas for your time between classes." />
      <Chips items={['For you', 'Events', 'Saved']} value={filter} onChange={setFilter} />
      {visible.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{visible.map(event => <View key={event.id} style={{ width: compact ? '100%' : undefined, flexBasis: compact ? undefined : '30%', flexGrow: compact ? undefined : 1, maxWidth: compact ? undefined : 420 }}><EventCard event={event} /></View>)}</View> : <Card><Empty title={filter === 'Saved' ? 'No saved campus events.' : 'Campus events'} icon="calendar" description="Check Laurier’s official calendar for current events. Verified listings will appear here when available." action={<ExternalButton label="Official event calendar" url="https://events.wlu.ca/" />} /></Card>}
    </View>
    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 24 }}>
      <View style={{ flex: 1.5, gap: 18 }}><SectionTitle title="Find your community" action="All clubs" onPress={() => router.push('/clubs')} /><View style={{ flexDirection: compact ? 'column' : 'row', gap: 16 }}>{featuredClubs.map(club => <View key={club.id} style={{ flex: 1 }}><ClubCard club={club} /></View>)}</View></View>
      <View style={{ flex: 1, borderRadius: radii.card, backgroundColor: c.sage, padding: 28, gap: 16, justifyContent: 'center' }}><Icon name="navigation" size={25} color={c.green} /><T style={{ fontFamily: f.bold, fontSize: 25, lineHeight: 33, letterSpacing: -0.4 }}>Your next class,{'\n'}a little closer.</T><T style={{ color: c.green, lineHeight: 23, fontSize: 14 }}>Search a building or room code to find your way around campus.</T><Pressable accessibilityRole="button" onPress={() => router.push('/map')} style={({ pressed }) => [s.row, { gap: 9, minHeight: 44, opacity: pressed ? 0.65 : 1 }]}><T style={{ fontFamily: f.medium, color: c.green, fontSize: 14 }}>Open campus map</T><Icon name="arrow-right" color={c.green} size={17} /></Pressable></View>
    </View>
  </>;
}
