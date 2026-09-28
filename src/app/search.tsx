import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { Button, Empty, PageHeading, Search, SectionTitle, T } from '../components/ui';
import { clubs, events } from '../data/content';

export default function SearchPage() {
  const { q } = useLocalSearchParams<{ q?: string }>(); const [query, setQuery] = useState(q ?? ''); const [limit, setLimit] = useState(12); const { width } = useWindowDimensions();
  const normalized = query.trim().toLowerCase(); const foundClubs = normalized ? clubs.filter(c => `${c.name} ${c.theme}`.toLowerCase().includes(normalized)) : []; const foundEvents = normalized ? events.filter(e => `${e.title} ${e.shortTitle} ${e.category}`.toLowerCase().includes(normalized)) : [];
  const cardStyle = { flexBasis: width < 650 ? '100%' as const : '30%' as const, flexGrow: 1, maxWidth: width < 650 ? undefined : 420 };
  return <><PageHeading eyebrow="FOLLOW YOUR CURIOSITY" title="What are you looking for?" subtitle="Search the club directory and sample events. Try computing, coffee, arts, or outdoors." /><Search value={query} onChange={v => { setQuery(v); setLimit(12); }} placeholder="Find a club, an interest, or a sample event…" />
    {!!foundEvents.length && <><SectionTitle title="Sample events" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundEvents.map(event => <View key={event.id} style={cardStyle}><EventCard event={event} /></View>)}</View></>}
    {!!foundClubs.length && <><SectionTitle title={`Clubs (${foundClubs.length})`} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundClubs.slice(0, limit).map(club => <View key={club.id} style={cardStyle}><ClubCard club={club} /></View>)}</View>{foundClubs.length > limit && <Button secondary label="Show more results" onPress={() => setLimit(n => n + 18)} />}</>}
    {normalized && !foundEvents.length && !foundClubs.length && <Empty title="Nothing here for that search." description="Try a shorter keyword or a different interest." />}
    {!normalized && <View style={{ gap: 16 }}><T muted>Not sure where to start?</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{['Computing', 'Coffee', 'Arts', 'Outdoors'].map(term => <Button key={term} secondary label={term} onPress={() => setQuery(term)} />)}</View></View>}
  </>;
}
