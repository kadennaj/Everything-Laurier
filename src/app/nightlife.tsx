import { NightlifeAgeBoundary } from '../components/NightlifeAgeGate';
import React, { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { NightCard, VenueCard } from '../components/Nightlife';
import { InstagramFeed } from '../components/InstagramFeed';
import { LineCheckIns } from '../components/LineCheckIns';
import { Button, Card, Chips, Empty, Icon, Search, SectionTitle, T, s } from '../components/ui';
import { allNights, nights, venues } from '../data/nightlife';
import { colors as c, fonts as f } from '../lib/theme';
import { useLocal } from '../lib/state';

export default function Nightlife() {
  const { width } = useWindowDimensions(); const compact = width < 700;
  const [tab, setTab] = useState('The lineup'); const [day, setDay] = useState('Any day');
  const [mood, setMood] = useState('All moods'); const [query, setQuery] = useState('');
  const { saved } = useLocal();
  const matching = (tab === 'Saved' ? allNights : nights).filter(n => (tab === 'Saved' || day === 'Any day' || n.day === day) && (tab === 'Saved' || mood === 'All moods' || n.genre === mood) && `${n.title} ${n.genre} ${venues.find(v => v.id === n.venueId)?.name}`.toLowerCase().includes(query.toLowerCase()) && (tab !== 'Saved' || saved.includes(`night:${n.id}`)));
  const places = venues.filter(v => `${v.name} ${v.tags.join(' ')} ${v.kind}`.toLowerCase().includes(query.toLowerCase()) && (tab !== 'Saved' || saved.includes(`venue:${v.id}`)));
  const cardWidth = compact ? '100%' : width >= 1450 ? '31%' : '47%';
  return <NightlifeAgeBoundary><>
    <View style={{ borderRadius: 26, padding: compact ? 24 : 36, gap: 20, backgroundColor: c.night }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><Icon name="moon" size={23} color={c.gold} /><T style={{ color: c.nightMuted, fontSize: 12 }}>Waterloo · 19+</T></View>
      <View style={{ gap: 12 }}><T accessibilityRole="header" style={{ color: c.surface, fontFamily: f.bold, fontSize: compact ? 32 : 43, lineHeight: compact ? 41 : 52, letterSpacing: -0.4 }}>Make tonight a good one.</T><T style={{ color: c.nightMuted, fontSize: 15, lineHeight: 24, maxWidth: 470 }}>Find a night, pick a place, and check the line before you go.</T></View>
      <View style={{ alignItems: 'flex-start' }}><Pressable accessibilityRole="button" onPress={() => router.push('/night/retro-sundays')} style={({ pressed }) => [s.row, { backgroundColor: c.surface, paddingHorizontal: 18, paddingVertical: 13, minHeight: 48, borderRadius: 14, gap: 12, opacity: pressed ? 0.8 : 1 }]}><T style={{ fontFamily: f.medium, fontSize: 14, color: c.night }}>Featured night</T><Icon name="arrow-up-right" size={17} color={c.night} /></Pressable></View>
    </View>
    <LineCheckIns />
    <InstagramFeed />
    <View style={{ gap: 20 }}>
      <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.border, gap: compact ? 24 : 34 }]}>{['The lineup', 'The places', 'Saved'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === tab }} onPress={() => setTab(item)} style={{ paddingVertical: 15, minHeight: 48, borderBottomWidth: 2, borderBottomColor: item === tab ? c.purple : 'transparent' }}><T style={{ fontFamily: item === tab ? f.bold : f.medium, fontSize: 15, color: item === tab ? c.purple : c.muted }}>{item}</T></Pressable>)}</View>
      <Search value={query} onChange={setQuery} placeholder="Search nights, venues, or music…" />
      {tab === 'The lineup' && <><Chips items={['Any day', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} value={day} onChange={setDay} /><View style={{ marginTop: -8 }}><Chips items={['All moods', 'Throwbacks', 'DJs', 'Trivia', 'Pub nights']} value={mood} onChange={setMood} /></View></>}
      <SectionTitle title={tab === 'The places' ? 'Places to go' : tab === 'Saved' ? 'Your saved plans' : 'The weekly lineup'} subtitle={tab === 'The places' ? 'Find your next favourite spot.' : tab === 'Saved' ? 'Your saved nights and favourite places.' : 'Explore the weekly programmes. Check each venue for current dates.'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>{tab !== 'The places' && matching.map(night => <View key={night.id} style={{ flexBasis: cardWidth, flexGrow: 1, maxWidth: compact ? undefined : 580 }}><NightCard night={night} /></View>)}{tab !== 'The lineup' && places.map(venue => <View key={venue.id} style={{ flexBasis: cardWidth, flexGrow: 1, maxWidth: compact ? undefined : 580 }}><VenueCard venue={venue} /></View>)}</View>
      {((tab === 'The lineup' && !matching.length) || (tab === 'The places' && !places.length) || (tab === 'Saved' && !matching.length && !places.length)) && <Card><Empty icon={tab === 'Saved' ? 'bookmark' : 'moon'} title={tab === 'Saved' ? 'Your night starts with a save.' : 'A quieter corner of the week.'} description={tab === 'Saved' ? 'Bookmark a night or venue and keep your options together.' : 'No matching programmes in this edit. Try another day or mood.'} action={<Button label="Explore the lineup" onPress={() => { setTab('The lineup'); setDay('Any day'); setMood('All moods'); setQuery(''); }} />} /></Card>}
    </View>
    {tab !== 'The places' && <View style={{ alignItems: 'flex-start' }}><Button secondary label="Explore all venues" icon="arrow-right" onPress={() => { setTab('The places'); setQuery(''); }} /></View>}
  </></NightlifeAgeBoundary>;
}
