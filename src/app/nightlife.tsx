import React, { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { NightArt, NightCard, VenueCard } from '../components/Nightlife';
import { InstagramFeed } from '../components/InstagramFeed';
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
    <View style={[s.row, { justifyContent: 'space-between' }]}><Eyebrow>THE AFTER-HOURS EDIT</Eyebrow><T muted style={{ fontSize: 12 }}>Waterloo · 19+</T></View>
    <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: '#292132' }}>
      <NightArt palette="retro" title={'Good nights.\nGreat stories.'} subtitle="Everything Laurier / After dark" height={compact ? 260 : 310} hero />
      <View style={{ padding: compact ? 25 : 32, paddingTop: 0, gap: 20 }}><T style={{ color: '#DACEDE', fontSize: 15, lineHeight: 24, maxWidth: 460 }}>From the campus table to the last song. Find a night that feels like your kind of night.</T><View style={[s.row, { gap: 12, flexWrap: 'wrap' }]}><Pressable accessibilityRole="button" onPress={() => router.push('/night/retro-sundays')} style={({ pressed }) => [s.row, { backgroundColor: c.gold, padding: 15, borderRadius: 10, gap: 18, minHeight: 48, opacity: pressed ? 0.8 : 1 }]}><T style={{ fontFamily: f.bold, color: c.purpleDark }}>Meet Retro Sundays</T><Icon name="arrow-up-right" size={18} color={c.purpleDark} /></Pressable><T style={{ color: '#DACEDE', fontSize: 12 }}>Phil’s · Throwbacks · Sundays</T></View></View>
    </View>
    <View style={{ flexDirection: compact ? 'column' : 'row', gap: compact ? 16 : 30, paddingVertical: 6 }}>
      {[{ n: '01', title: 'Pick the mood', sub: 'Dance floor or a familiar table.' }, { n: '02', title: 'Find your regular', sub: 'Real places, a little closer.' }, { n: '03', title: 'Keep the good plans', sub: 'Save a night. Bring your people.' }].map(item => <View key={item.n} style={[s.row, { flex: 1, gap: 13 }]}><T style={{ color: '#A58DAD', fontFamily: f.serif, fontSize: 27 }}>{item.n}</T><View style={{ flex: 1, gap: 4 }}><T style={{ fontFamily: f.bold, fontSize: 13 }}>{item.title}</T><T muted style={{ fontSize: 12 }}>{item.sub}</T></View></View>)}
    </View>
    <InstagramFeed />
    <View style={{ gap: 20 }}>
      <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.border, gap: compact ? 24 : 34 }]}>{['The lineup', 'The places', 'Saved'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === tab }} onPress={() => setTab(item)} style={{ paddingVertical: 15, minHeight: 48, borderBottomWidth: 2, borderBottomColor: item === tab ? c.purple : 'transparent' }}><T style={{ fontFamily: item === tab ? f.bold : f.medium, fontSize: 15, color: item === tab ? c.purple : c.muted }}>{item}</T></Pressable>)}</View>
      <Search value={query} onChange={setQuery} placeholder="Search nights, venues, or music…" />
      {tab === 'The lineup' && <><Chips items={['Any day', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} value={day} onChange={setDay} /><View style={{ marginTop: -8 }}><Chips items={['All moods', 'Throwbacks', 'DJs', 'Trivia', 'Pub nights']} value={mood} onChange={setMood} /></View></>}
      <SectionTitle title={tab === 'The places' ? 'Find your usual.' : tab === 'Saved' ? 'Your next good night.' : 'A night for every mood.'} subtitle={tab === 'The places' ? 'Four places, four different ways to spend an evening.' : tab === 'Saved' ? 'Your saved nights and favourite places.' : 'Explore the weekly programmes. Check each venue for current dates.'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>{tab !== 'The places' && matching.map(night => <View key={night.id} style={{ flexBasis: cardWidth, flexGrow: 1, maxWidth: compact ? undefined : 580 }}><NightCard night={night} /></View>)}{tab !== 'The lineup' && places.map(venue => <View key={venue.id} style={{ flexBasis: cardWidth, flexGrow: 1, maxWidth: compact ? undefined : 580 }}><VenueCard venue={venue} /></View>)}</View>
      {((tab === 'The lineup' && !matching.length) || (tab === 'The places' && !places.length) || (tab === 'Saved' && !matching.length && !places.length)) && <Card><Empty icon={tab === 'Saved' ? 'bookmark' : 'moon'} title={tab === 'Saved' ? 'Your night starts with a save.' : 'A quieter corner of the week.'} description={tab === 'Saved' ? 'Bookmark a night or venue and keep your options together.' : 'No matching programmes in this edit. Try another day or mood.'} action={<Button label="Explore the lineup" onPress={() => { setTab('The lineup'); setDay('Any day'); setMood('All moods'); setQuery(''); }} />} /></Card>}
    </View>
    <View style={{ padding: 27, borderRadius: 20, backgroundColor: '#EDE8DE', gap: 12 }}><Eyebrow>BEYOND THE WEEKLY ROTATION</Eyebrow><T style={{ fontFamily: f.serif, fontSize: 28 }}>One night. A different energy.</T><T muted style={{ fontSize: 15, lineHeight: 24, maxWidth: 670 }}>Phil’s has also hosted Raving Lunatics Vol. 5, a multi-DJ special. Explore the event spotlight and the people behind the booth.</T><View style={{ alignItems: 'flex-start' }}><Button secondary label="Explore the spotlight" icon="arrow-up-right" onPress={() => router.push('/night/raving-lunatics')} /></View></View>
    {tab !== 'The places' && <View style={{ gap: 18 }}><SectionTitle title="Know the place before you go." action="All places" onPress={() => { setTab('The places'); setQuery(''); }} /><View style={{ flexDirection: compact ? 'column' : 'row', gap: 18 }}>{venues.slice(0, 2).map(venue => <View key={venue.id} style={{ flex: 1 }}><VenueCard venue={venue} /></View>)}</View></View>}
  </>;
}
