import { router } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { Button, Card, Chips, Empty, PageHeading, T } from '../components/ui';
import { NightCard, VenueCard } from '../components/Nightlife';
import { allNights, venues } from '../data/nightlife';
import { clubs, events } from '../data/content';
import { useLocal } from '../lib/state';

export default function Saved() {
  const { saved, ready, nightlifeAgeConfirmed } = useLocal(); const [tab, setTab] = useState('Everything'); const { width } = useWindowDimensions();
  const savedEvents = !['Everything', 'Events'].includes(tab) ? [] : events.filter(e => saved.includes(`event:${e.id}`));
  const savedClubs = !['Everything', 'Clubs'].includes(tab) ? [] : clubs.filter(e => saved.includes(`club:${e.id}`));
  const savedNights = nightlifeAgeConfirmed && ['Everything', 'Nightlife'].includes(tab) ? allNights.filter(n => saved.includes(`night:${n.id}`)) : [];
  const savedVenues = nightlifeAgeConfirmed && ['Everything', 'Nightlife'].includes(tab) ? venues.filter(v => saved.includes(`venue:${v.id}`)) : [];
  const count = savedEvents.length + savedClubs.length + savedNights.length + savedVenues.length;
  const cardStyle = { flexBasis: width < 650 ? '100%' as const : '30%' as const, flexGrow: 1, maxWidth: width < 650 ? undefined : 420 };
  return <><PageHeading eyebrow="YOUR COLLECTION" title="Saved for later." subtitle="Your favourite clubs, venues, and plans in one place." /><Chips items={['Everything', 'Nightlife', 'Events', 'Clubs']} value={tab} onChange={setTab} />
    <T muted style={{ fontSize: 12 }}>Saved on this device · {count} items</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{savedNights.map(n => <View key={n.id} style={cardStyle}><NightCard night={n} /></View>)}{savedVenues.map(v => <View key={v.id} style={cardStyle}><VenueCard venue={v} /></View>)}{savedEvents.map(event => <View key={event.id} style={{ flexBasis: width < 650 ? '100%' : '30%', flexGrow: 1, maxWidth: width < 650 ? undefined : 420 }}><EventCard event={event} /></View>)}{savedClubs.map(club => <View key={club.id} style={{ flexBasis: width < 650 ? '100%' : '30%', flexGrow: 1, maxWidth: width < 650 ? undefined : 420 }}><ClubCard club={club} /></View>)}</View>
    {!count && <Card><Empty icon="bookmark" title={ready ? 'Something will catch your eye.' : 'Gathering your saved items…'} description="Tap the bookmark on a club, venue, or event. It will be waiting here when you’re ready." action={<Button label="Explore your campus" onPress={() => router.push('/')} />} /></Card>}
  </>;
}
