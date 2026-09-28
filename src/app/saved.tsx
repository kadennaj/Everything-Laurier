import { router } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { Button, Card, Chips, Empty, PageHeading, T } from '../components/ui';
import { clubs, events } from '../data/content';
import { useLocal } from '../lib/state';

export default function Saved() {
  const { saved, ready } = useLocal(); const [tab, setTab] = useState('Everything'); const { width } = useWindowDimensions();
  const savedEvents = tab === 'Clubs' ? [] : events.filter(e => saved.includes(`event:${e.id}`));
  const savedClubs = tab === 'Events' ? [] : clubs.filter(e => saved.includes(`club:${e.id}`));
  return <><PageHeading eyebrow="KEEP THE GOOD STUFF CLOSE" title="For another day." subtitle="The clubs you’re curious about. The plans you don’t want to forget. All in one little corner of campus." /><Chips items={['Everything', 'Events', 'Clubs']} value={tab} onChange={setTab} />
    <T muted style={{ fontSize: 12 }}>Saved on this device · {savedEvents.length + savedClubs.length} items</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{savedEvents.map(event => <View key={event.id} style={{ flexBasis: width < 650 ? '100%' : '30%', flexGrow: 1, maxWidth: width < 650 ? undefined : 420 }}><EventCard event={event} /></View>)}{savedClubs.map(club => <View key={club.id} style={{ flexBasis: width < 650 ? '100%' : '30%', flexGrow: 1, maxWidth: width < 650 ? undefined : 420 }}><ClubCard club={club} /></View>)}</View>
    {!savedEvents.length && !savedClubs.length && <Card><Empty icon="bookmark" title={ready ? 'Something will catch your eye.' : 'Gathering your saved items…'} description="Tap the bookmark on a club or sample event. It will be waiting here when you’re ready." action={<Button label="Explore your campus" onPress={() => router.push('/')} />} /></Card>}
  </>;
}
