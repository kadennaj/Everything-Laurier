import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { Badge, Button, Card, Chips, Empty, Eyebrow, Icon, IconName, SectionTitle, T, s } from '../components/ui';
import { clubs, events } from '../data/content';
import { useLocal } from '../lib/state';
import { colors as c, fonts as f } from '../lib/theme';

export default function Discover() {
  const { width } = useWindowDimensions(); const compact = width < 650; const desktop = width >= 1000;
  const [filter, setFilter] = useState('For you'); const [adult, setAdult] = useState(false); const { saved } = useLocal();
  const visible = filter === 'Saved' ? events.filter(e => saved.includes(`event:${e.id}`)) : filter === 'Nightlife' ? events.filter(e => e.category === 'Nightlife') : events.filter(e => e.category !== 'Nightlife').slice(0, 3);
  const featuredClubs = ['laurier-computing-society-lcs', 'laurier-outdoors-club'].map(id => clubs.find(club => club.id === id)).filter(club => !!club);
  const shortcuts: { label: string; sub: string; icon: IconName; path: '/clubs' | '/map' | '/people' | '/help'; color: string }[] = [
    { label: 'Find your people', sub: `${clubs.length} clubs to explore`, icon: 'users', path: '/clubs', color: c.lavender },
    { label: 'Know your way', sub: 'Your campus, mapped', icon: 'map', path: '/map', color: c.sage },
    { label: 'Make a connection', sub: 'Beyond your program', icon: 'coffee', path: '/people', color: c.peach },
    { label: 'Find a little support', sub: 'You’ve got this', icon: 'book-open', path: '/help', color: '#F6EFD9' },
  ];
  return <>
    <View style={[s.row, { justifyContent: 'space-between', marginBottom: -7 }]}><Eyebrow>THE WATERLOO EDIT</Eyebrow><View style={[s.row, { gap: 6 }]}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.green }} /><T muted style={{ fontSize: 11 }}>Made for Laurier life</T></View></View>
    <View style={{ minHeight: compact ? 344 : 316, borderRadius: 22, overflow: 'hidden', backgroundColor: c.purpleDark }}>
      <Image source={require('../../assets/images/campus.jpg')} accessibilityLabel="Schlegel Centre at Laurier Waterloo, photographed by LeonV" style={{ position: 'absolute', right: 0, width: compact ? '100%' : '65%', height: '100%', opacity: compact ? 0.35 : 0.85 }} resizeMode="cover" />
      <LinearGradient colors={compact ? ['#432959E8', '#432959B0'] : ['#432959', '#432959F5', '#43295910']} locations={compact ? [0, 1] : [0, 0.38, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ padding: compact ? 26 : 36, gap: 17, alignItems: 'flex-start', maxWidth: compact ? undefined : 600 }}>
        <View style={[s.row, { gap: 7 }]}><Icon name="sun" size={14} color={c.gold} /><T style={{ fontSize: 9, letterSpacing: 1.8, color: '#E8DDF0', fontFamily: f.bold }}>LESS FOMO. MORE LAURIER.</T></View>
        <T accessibilityRole="header" style={{ fontFamily: f.serif, color: '#FFF', fontSize: compact ? 36 : 47, lineHeight: compact ? 43 : 54, letterSpacing: -1 }}>Your campus.{'\n'}<T style={{ fontFamily: f.italic, fontSize: compact ? 36 : 47, color: c.gold }}>Your kind of plans.</T></T>
        <T style={{ color: '#E6DDEA', fontSize: 14, lineHeight: 23, maxWidth: 355 }}>The people, places, and little moments that make university feel like you.</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/clubs')} style={({ pressed }) => [s.row, { backgroundColor: c.gold, borderRadius: 9, paddingVertical: 13, paddingHorizontal: 19, gap: 16, minHeight: 46, marginTop: 3, opacity: pressed ? 0.8 : 1 }]}><T style={{ fontFamily: f.bold, fontSize: 13, color: c.purpleDark }}>Find your community</T><Icon name="arrow-right" size={17} color={c.purpleDark} /></Pressable>
      </View>
      {!compact && <View style={{ position: 'absolute', right: 20, bottom: 19, backgroundColor: '#FFFFFFED', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }}><Icon name="map-pin" size={12} color={c.purple} /><T style={{ fontSize: 10, color: c.purple }}>Schlegel Centre · Waterloo</T></View>}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{shortcuts.map(item => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.path)} style={({ pressed }) => ({ flexBasis: compact ? '47%' : '22%', flexGrow: 1, borderWidth: 1, borderColor: c.border, borderRadius: 13, padding: compact ? 13 : 16, backgroundColor: pressed ? item.color : c.surface, flexDirection: 'row', gap: 11, alignItems: 'center' })}><View style={{ width: 36, height: 39, borderRadius: 11, backgroundColor: item.color, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} size={18} color={c.purple} /></View><View style={{ flex: 1, gap: 5 }}><T style={{ fontFamily: f.bold, fontSize: compact ? 11 : 12 }}>{item.label}</T><T muted style={{ fontSize: 10, lineHeight: 14 }}>{item.sub}</T></View></Pressable>)}</View>
    <View style={{ gap: 19, marginTop: 5 }}>
      <SectionTitle title="Good things are happening." subtitle="A little inspiration for your time between classes." />
      <View style={{ flexDirection: compact ? 'column' : 'row', justifyContent: 'space-between', gap: 12, alignItems: compact ? 'stretch' : 'center' }}><Chips items={['For you', 'Events', 'Nightlife', 'Saved']} value={filter} onChange={setFilter} /><T muted style={{ fontSize: 10 }}>Sample events · design preview</T></View>
      {filter === 'Nightlife' && !adult ? <Card><Empty title="A night out, your way." icon="moon" description="The nightlife preview contains 19+ event concepts. Confirm your age to explore." action={<Button label="I’m 19 or older" onPress={() => setAdult(true)} />} /></Card> : visible.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{visible.map(event => <View key={event.id} style={{ width: compact ? '100%' : undefined, flexBasis: compact ? undefined : '30%', flexGrow: compact ? undefined : 1, maxWidth: compact ? undefined : 420 }}><EventCard event={event} /></View>)}</View> : <Card><Empty title="Keep a good plan close." icon="bookmark" description="Tap a bookmark on a sample event to find it here later." action={<Button label="Explore events" onPress={() => setFilter('Events')} />} /></Card>}
    </View>
    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 24, marginTop: 8 }}>
      <View style={{ flex: 1.5, gap: 17 }}><SectionTitle title="There’s a club for that." action="All clubs" onPress={() => router.push('/clubs')} /><View style={{ flexDirection: compact ? 'column' : 'row', gap: 16 }}>{featuredClubs.map(club => <View key={club.id} style={{ flex: 1 }}><ClubCard club={club} /></View>)}</View></View>
      <View style={{ flex: 1, borderRadius: 18, backgroundColor: '#EAEFE9', padding: 26, gap: 14, justifyContent: 'center' }}><View style={[s.row, { justifyContent: 'space-between' }]}><Badge label="FIND YOUR WAY" color="#D9E4D7" textColor="#35654F" /><Icon name="navigation" size={25} color={c.green} /></View><T style={{ fontFamily: f.serif, fontSize: 28, lineHeight: 35 }}>New building?\nNo big deal.</T><T style={{ color: '#647160', lineHeight: 22, fontSize: 13 }}>Turn that room code into somewhere you know. Start with LH, BA, or FNCC.</T><Pressable accessibilityRole="button" onPress={() => router.push('/map')} style={[s.row, { gap: 9, minHeight: 44 }]}><T style={{ fontFamily: f.bold, color: c.green, fontSize: 13 }}>Explore your campus</T><Icon name="arrow-right" color={c.green} size={17} /></Pressable></View>
    </View>
  </>;
}
