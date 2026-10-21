import { NightlifeAgeBoundary } from '../../components/NightlifeAgeGate';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { NightArt, NightCard } from '../../components/Nightlife';
import { Badge, Button, Card, Empty, ExternalButton, Eyebrow, Icon, SectionTitle, T, body, s } from '../../components/ui';
import { getVenue, nightlifeChecked, nights } from '../../data/nightlife';
import { useLocal } from '../../lib/state';
import { colors as c, fonts as f } from '../../lib/theme';

export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const venue = getVenue(id); const { saved, toggleSave } = useLocal(); const { width } = useWindowDimensions(); const compact = width < 800;
  if (!venue) return <Empty title="We haven’t met this place yet." description="Explore the venues in the Waterloo edit." action={<Button label="Explore Nightlife" onPress={() => router.replace('/nightlife')} />} />;
  const selected = saved.includes(`venue:${venue.id}`);
  return <NightlifeAgeBoundary><><View style={{ alignItems: 'flex-start' }}><Button secondary label="Nightlife" icon="arrow-left" onPress={() => router.navigate('/nightlife')} /></View><Card><NightArt palette={venue.palette} title={venue.shortName} subtitle={`${venue.area} / The venue edit`} height={compact ? 270 : 320} hero /></Card>
    <View style={{ flexDirection: compact ? 'column' : 'row', gap: 28 }}><View style={{ flex: 1.6, gap: 20 }}><View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}>{venue.tags.map(tag => <Badge key={tag} label={tag} color={c.peach} textColor={c.purple} />)}</View><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: compact ? 35 : 43 }}>{venue.name}</T><T style={{ fontFamily: f.bold, fontSize: 25, lineHeight: 34 }}>{venue.summary}</T><T style={body}>{venue.about}</T><View style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }} /><Eyebrow>BEFORE YOU GO</Eyebrow><View style={{ gap: 20 }}>{[{ icon: 'map-pin' as const, title: 'Find the entrance', value: venue.address }, { icon: 'clock' as const, title: 'Regular schedule', value: venue.hours }, { icon: 'tag' as const, title: 'Entry', value: venue.entry }].map(item => <View key={item.title} style={[s.row, { alignItems: 'flex-start', gap: 14 }]}><Icon name={item.icon} color={c.purple} size={19} /><View style={{ flex: 1, gap: 6 }}><T style={{ fontFamily: f.bold }}>{item.title}</T><T style={body}>{item.value}</T></View></View>)}</View><T muted style={{ fontSize: 12, lineHeight: 21 }}>{venue.note}</T></View>
      <View style={{ flex: 1, gap: 18 }}><Card style={{ padding: 25, gap: 17 }}><Button label={selected ? 'Venue saved' : 'Save this place'} icon={selected ? 'check' : 'bookmark'} onPress={() => toggleSave(`venue:${venue.id}`)} /><ExternalButton label="Get directions" url={`https://maps.apple.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`} /><ExternalButton label="Official website" url={venue.website} /></Card></View></View>
    <SectionTitle title="Weekly nights" subtitle="Weekly programmes are separate from one-off events and opening hours." /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>{nights.filter(n => n.venueId === venue.id).map(n => <View key={n.id} style={{ flexBasis: compact ? '100%' : '47%', flexGrow: 1, maxWidth: compact ? undefined : 580 }}><NightCard night={n} /></View>)}</View>
    <View style={{ gap: 12, alignItems: 'flex-start' }}><T muted style={{ fontSize: 12 }}>Editorial check · {nightlifeChecked}</T><ExternalButton label="View information source" url={venue.source} /></View>
  </></NightlifeAgeBoundary>;
}
