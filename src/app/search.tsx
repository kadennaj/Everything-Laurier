import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ClubCard, EventCard } from '../components/cards';
import { Button, Card, Chips, Empty, NavigationRow, PageHeading, Search, SectionTitle, T } from '../components/ui';
import { NightCard, VenueCard } from '../components/Nightlife';
import { allNights, venues } from '../data/nightlife';
import { useLocal } from '../lib/state';
import { clubs } from '../data/content';
import mapEntries from '../data/map-search.json';
import { findMapPlaces, mapDestination } from '../lib/map-search';
import { CalendarStatus } from '../components/CalendarStatus';
import { useOfficialEvents } from '../lib/official-events';

export default function SearchPage() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return <SearchResults key={q ?? ''} initialQuery={q ?? ''} />;
}
function SearchResults({ initialQuery }: { initialQuery: string }) {
  const { nightlifeAgeConfirmed } = useLocal();
  const { events, loading, error, now } = useOfficialEvents();
  const [query, setQuery] = useState(initialQuery), [scope, setScope] = useState('All'), [limit, setLimit] = useState(8);
  const { width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 700;
  const normalized = query.trim().toLowerCase();
  const places = findMapPlaces(query, mapEntries);
  const foundClubs = normalized ? clubs.filter(club => `${club.name} ${club.theme}`.toLowerCase().includes(normalized)) : [];
  const foundEvents = normalized ? events.filter(event => Date.parse(event.endsAt) >= now && `${event.title} ${event.place} ${event.category} ${event.host}`.toLowerCase().includes(normalized)) : [];
  const foundNights = normalized && nightlifeAgeConfirmed ? allNights.filter(night => `${night.title} ${night.genre} ${venues.find(venue => venue.id === night.venueId)?.name}`.toLowerCase().includes(normalized)) : [];
  const foundVenues = normalized && nightlifeAgeConfirmed ? venues.filter(venue => `${venue.name} ${venue.tags.join(' ')}`.toLowerCase().includes(normalized)) : [];
  const show = (name: string) => scope === 'All' || scope === name;
  const resultCount = (show('Places') ? places.length : 0) + (show('Clubs') ? foundClubs.length : 0) + (show('Events') ? foundEvents.length : 0) + (show('Nightlife') ? foundNights.length + foundVenues.length : 0);
  const cardStyle = { flexBasis: compact ? '100%' as const : '30%' as const, flexGrow: 1, maxWidth: compact ? undefined : 420 };
  return <><PageHeading title="Search campus" subtitle="Buildings, rooms, clubs and your next plan." />
    <Search value={query} onChange={value => { setQuery(value); setLimit(8); }} placeholder="Try Library, LH 1001 or Computing" autoFocus={!initialQuery} />
    <Chips items={nightlifeAgeConfirmed ? ['All', 'Places', 'Clubs', 'Events', 'Nightlife'] : ['All', 'Places', 'Clubs', 'Events']} value={scope} onChange={value => { setScope(value); setLimit(8); }} />
    {!!normalized && <T muted accessibilityLiveRegion="polite" style={{ fontSize: 14, lineHeight: 21 }}>{resultCount} {resultCount === 1 ? 'match' : 'matches'}{loading && show('Events') ? ' · Checking campus events…' : ''}</T>}
    {show('Places') && places.length > 0 && <View style={{ gap: 14 }}><SectionTitle title="Buildings & rooms" subtitle="Open a destination on its mapped floor." /><Card>{places.slice(0, limit).map((place, index) => <NavigationRow key={`${place.building}:${place.floor}:${place.room}`} title={place.title} description={place.kind === 'place' ? 'Campus place · View on map' : place.kind === 'building' ? 'Campus building · Open indoor map' : `${place.buildingName} · Floor ${place.floor}`} icon={place.room ? 'map-pin' : 'map'} last={index === Math.min(places.length, limit) - 1} onPress={() => router.push(mapDestination(place))} />)}</Card>{places.length > limit && <Button secondary label="Show more places" onPress={() => setLimit(value => value + 12)} />}</View>}
    {show('Clubs') && foundClubs.length > 0 && <><SectionTitle title={`Clubs (${foundClubs.length})`} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundClubs.slice(0, limit).map(club => <View key={club.id} style={cardStyle}><ClubCard club={club} /></View>)}</View>{foundClubs.length > limit && <Button secondary label="Show more clubs" onPress={() => setLimit(value => value + 12)} />}</>}
    {show('Events') && foundEvents.length > 0 && <><SectionTitle title={`Campus events (${foundEvents.length})`} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundEvents.slice(0, limit).map(event => <View key={event.id} style={cardStyle}><EventCard event={event} /></View>)}</View>{foundEvents.length > limit && <Button secondary label="Show more events" onPress={() => setLimit(value => value + 12)} />}</>}
    {show('Events') && !!normalized && (scope === 'Events' || foundEvents.length > 0 || (!!error && resultCount === 0)) && <CalendarStatus />}
    {show('Nightlife') && foundVenues.length > 0 && <><SectionTitle title="Venues" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundVenues.map(venue => <View key={venue.id} style={cardStyle}><VenueCard venue={venue} /></View>)}</View></>}
    {show('Nightlife') && foundNights.length > 0 && <><SectionTitle title="Nights out" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{foundNights.map(night => <View key={night.id} style={cardStyle}><NightCard night={night} /></View>)}</View></>}
    {normalized && resultCount === 0 && (!show('Events') || !loading) && <Card><Empty title="Try another search" description={error && show('Events') ? 'No local matches. Campus events could not refresh; try another word or the official calendar.' : 'Try a building name, room number, club or shorter keyword.'} action={<Button secondary label="Clear search" onPress={() => setQuery('')} />} /></Card>}
    {!normalized && <View style={{ gap: 18 }}><SectionTitle title="Start somewhere familiar" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{['Library', 'Lazaridis', 'Science', 'Computing'].map(term => <Button key={term} secondary label={term} onPress={() => setQuery(term)} />)}</View><Card><NavigationRow title="Browse the campus map" description="Explore buildings and mapped indoor floors" icon="map" onPress={() => router.push('/map')} /><NavigationRow title="Find academic help" description="Campus support and course-specific peer tutors" icon="book-open" last onPress={() => router.push('/help')} /></Card></View>}
  </>;
}
