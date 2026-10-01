import React, { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { NightArt, NightCard, VenueCard } from '../components/Nightlife';
import { InstagramFeed } from '../components/InstagramFeed';
import { LineCheckIns } from '../components/LineCheckIns';
import { Button, Card, Chips, Empty, Eyebrow, Icon, Search, SectionTitle, T, s } from '../components/ui';
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
  return <>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Eyebrow>WATERLOO AFTER DARK</Eyebrow><T muted style={{ fontSize: 12 }}>19+ venues</T></View>
    <View style={{ borderRadius: 21, overflow: 'hidden', backgroundColor: c.night }}>
      <NightArt palette="retro" title={'Make tonight\na good one.'} subtitle="EVERYTHING LAURIER / NIGHTLIFE" height={compact ? 190 : 230} hero />
      <View style={{ paddingHorizontal: compact ? 20 : 28, paddingBottom: 18, flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'flex-start' : 'center', gap: 14, justifyContent: 'space-between' }}><T style={{ color: c.nightMuted, fontSize: 14, lineHeight: 21, maxWidth: 470 }}>What’s happening, where to go, and what the line looks like right now.</T><Pressable accessibilityRole="button" onPress={() => router.push('/night/retro-sundays')} style={({ pressed }) => [s.row, { backgroundColor: c.gold, paddingHorizontal: 15, minHeight: 44, borderRadius: 11, gap: 9, opacity: pressed ? 0.8 : 1 }]}><T style={{ fontFamily: f.bold, fontSize: 13, color: c.night }}>Featured night</T><Icon name="arrow-up-right" size={16} color={c.night} /></Pressable></View>
    </View>
    <LineCheckIns />
    <InstagramFeed />
    <View style={{ gap: 20 }}>
      <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.border, gap: compact ? 24 : 34 }]}>{['The lineup', 'The places', 'Saved'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === tab }} onPress={() => setTab(item)} style={{ paddingVertical: 15, minHeight: 48, borderBottomWidth: 2, borderBottomColor: item === tab ? c.purple : 'transparent' }}><T style={{ fontFamily: item === tab ? f.bold : f.medium, fontSize: 15, color: item === tab ? c.purple : c.muted }}>{item}</T></Pressable>)}</View>
      <Search value={query} onChange={setQuery} placeholder="Search nights, venues, or music…" />
      {tab === 'The lineup' && <><Chips items={['Any day', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} value={day} onChange={setDay} /><View style={{ marginTop: -8 }}><Chips items={['All moods', 'Throwbacks', 'DJs', 'Trivia', 'Pub nights']} value={mood} onChange={setMood} /></View></>}
      <SectionTitle title={tab === 'The places' ? 'Find your usual.' : tab === 'Saved' ? 'Your next good night.' : 'A night for every mood.'} subtitle={tab === 'The places' ? 'Four places, four different ways to spend an evening.' : tab === 'Saved' ? 'Your saved nights and favourite places.' : 'Explore the weekly programmes. Check each venue for current dates.'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>{tab !== 'The places' && matching.map(night => <View key={night.id} style={{ flexBasis: cardWidth, flexGrow: 1, maxWidth: compact ? undefined : 580 }}><NightCard night={night} /></View>)}{tab !== 'The lineup' && places.map(venue => <View key={venue.id} style={{ flexBasis: cardWidth, flexGrow: 1, maxWidth: compact ? undefined : 580 }}><VenueCard venue={venue} /></View>)}</View>
      {((tab === 'The lineup' && !matching.length) || (tab === 'The places' && !places.length) || (tab === 'Saved' && !matching.length && !places.length)) && <Card><Empty icon={tab === 'Saved' ? 'bookmark' : 'moon'} title={tab === 'Saved' ? 'Your night starts with a save.' : 'A quieter corner of the week.'} description={tab === 'Saved' ? 'Bookmark a night or venue and keep your options together.' : 'No matching programmes in this edit. Try another day or mood.'} action={<Button label="Explore the lineup" onPress={() => { setTab('The lineup'); setDay('Any day'); setMood('All moods'); setQuery(''); }} />} /></Card>}
    </View>
    {tab !== 'The places' && <View style={{ alignItems: 'flex-start' }}><Button secondary label="Explore all venues" icon="arrow-right" onPress={() => { setTab('The places'); setQuery(''); }} /></View>}
  </>;
}
