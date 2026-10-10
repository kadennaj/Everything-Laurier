import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { Button, Empty, PageHeading, Search, SectionTitle, T } from '../components/ui';
import { NightCard, VenueCard } from '../components/Nightlife';
import { allNights, venues } from '../data/nightlife';
import { useLocal } from '../lib/state';
import { clubs, events } from '../data/content';

export default function SearchPage() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return <SearchResults key={q ?? ''} initialQuery={q ?? ''} />;
}
function SearchResults({ initialQuery }: { initialQuery: string }) {
  const { nightlifeAgeConfirmed } = useLocal();
  const [query, setQuery] = useState(initialQuery); const [limit, setLimit] = useState(12); const { width } = useWindowDimensions();
  const normalized = query.trim().toLowerCase(); const foundClubs = normalized ? clubs.filter(c => `${c.name} ${c.theme}`.toLowerCase().includes(normalized)) : []; const foundEvents = normalized ? events.filter(e => `${e.title} ${e.shortTitle} ${e.category}`.toLowerCase().includes(normalized)) : [];
  const foundNights = normalized && nightlifeAgeConfirmed ? allNights.filter(n => `${n.title} ${n.genre} ${venues.find(v => v.id === n.venueId)?.name}`.toLowerCase().includes(normalized)) : [];
  const foundVenues = normalized && nightlifeAgeConfirmed ? venues.filter(v => `${v.name} ${v.tags.join(' ')}`.toLowerCase().includes(normalized)) : [];
  const cardStyle = { flexBasis: width < 650 ? '100%' as const : '30%' as const, flexGrow: 1, maxWidth: width < 650 ? undefined : 420 };
  return <><PageHeading eyebrow="EXPLORE" title="Search campus." subtitle="Find a club, a venue, or your next plan." /><Search value={query} onChange={v => { setQuery(v); setLimit(12); }} placeholder="Find a night, a venue, or a club…" />
    {!!foundNights.length && <><SectionTitle title="Nights out" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundNights.map(n => <View key={n.id} style={cardStyle}><NightCard night={n} /></View>)}</View></>}
    {!!foundVenues.length && <><SectionTitle title="Places" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundVenues.map(v => <View key={v.id} style={cardStyle}><VenueCard venue={v} /></View>)}</View></>}
    {!!foundEvents.length && <><SectionTitle title="Campus events" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundEvents.map(event => <View key={event.id} style={cardStyle}><EventCard event={event} /></View>)}</View></>}
    {!!foundClubs.length && <><SectionTitle title={`Clubs (${foundClubs.length})`} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundClubs.slice(0, limit).map(club => <View key={club.id} style={cardStyle}><ClubCard club={club} /></View>)}</View>{foundClubs.length > limit && <Button secondary label="Show more results" onPress={() => setLimit(n => n + 18)} />}</>}
    {normalized && !foundEvents.length && !foundClubs.length && !foundNights.length && !foundVenues.length && <Empty title="Nothing here for that search." description="Try a shorter keyword or a different interest." />}
    {!normalized && <View style={{ gap: 16 }}><T muted>Not sure where to start?</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{(nightlifeAgeConfirmed ? ['Retro', 'Crown', 'Trivia', 'Computing'] : ['Computing', 'Business', 'Outdoors']).map(term => <Button key={term} secondary label={term} onPress={() => setQuery(term)} />)}</View></View>}
  </>;
}
