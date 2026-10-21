import { useContentLayout } from '../../lib/use-content-layout';
import { NightlifeAgeBoundary } from '../../components/NightlifeAgeGate';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { NightArt, NightCard, VenueCard } from '../../components/Nightlife';
import { Badge, Button, Card, Empty, ExternalButton, Icon, IconName, SectionTitle, T, body, s } from '../../components/ui';
import { allNights, getVenue, nightlifeChecked, nights } from '../../data/nightlife';
import { useLocal } from '../../lib/state';
import { colors as c, fonts as f } from '../../lib/theme';

export default function NightDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const night = allNights.find(n => n.id === id);
  const { saved, toggleSave } = useLocal(); const { width, fontScale } = useContentLayout(); const compact = width / fontScale < 800;
  if (!night) return <Empty title="This night isn’t on the list." description="Find another plan in the nightlife edit." action={<Button label="Explore Nightlife" onPress={() => router.replace('/nightlife')} />} />;
  const venue = getVenue(night.venueId)!; const active = saved.includes(`night:${night.id}`);
  const facts: { icon: IconName; label: string; value: string }[] = [{ icon: 'calendar', label: 'WHEN', value: night.schedule }, { icon: 'clock', label: 'TIME', value: night.time }, { icon: 'music', label: 'ON THE SOUNDTRACK', value: night.lineup }, { icon: 'tag', label: 'AT THE DOOR', value: night.cost }];
  return <NightlifeAgeBoundary><><View style={{ alignItems: 'flex-start' }}><Button secondary label="Nightlife" icon="arrow-left" onPress={() => router.navigate('/nightlife')} /></View>
    <Card><NightArt palette={night.palette} title={night.artTitle} subtitle={`${venue.shortName} / ${night.kicker}`} height={compact ? 280 : 350} hero /></Card>
    <View style={{ flexDirection: compact ? 'column' : 'row', gap: 28, alignItems: compact ? 'stretch' : 'flex-start' }}>
      <View style={{ flex: 1.6, gap: 24 }}><View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}><Badge label={night.type} /><Badge label={night.genre} color={c.peach} /></View><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: compact ? 36 : 43, lineHeight: compact ? 44 : 52 }}>{night.title}</T><T muted style={{ fontSize: 16 }}>{venue.name} · Waterloo</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, paddingVertical: 24 }}>{facts.map(fact => <View key={fact.label} style={[s.row, { gap: 12, flexBasis: compact ? '100%' : '45%' }]}><Icon name={fact.icon} size={20} color={c.purple} /><View style={{ flex: 1, gap: 6 }}><T muted style={{ fontSize: 10, letterSpacing: 1.4 }}>{fact.label}</T><T style={{ fontFamily: f.medium, lineHeight: 22 }}>{fact.value}</T></View></View>)}</View>
        <T style={{ fontFamily: f.bold, fontSize: 28 }}>{night.mood}</T><T style={body}>{night.description}</T><T style={body}>{night.detail}</T>
        <View style={{ padding: 22, borderRadius: 16, backgroundColor: c.sage, gap: 9 }}><View style={[s.row, { gap: 8 }]}><Icon name="map-pin" size={17} color={c.green} /><T style={{ color: c.green, fontFamily: f.bold }}>Getting home</T></View><T style={[body, { color: c.green }]}>Choose a way home with your group before heading out.</T><View style={{ alignItems: 'flex-start' }}><ExternalButton label="Open directions" url={`https://maps.apple.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`} /></View></View>
      </View>
      <View style={{ flex: 1, gap: 18 }}><Card style={{ padding: 23, gap: 18 }}><Button label={active ? 'Saved to your plans' : 'Save this night'} icon={active ? 'check' : 'bookmark'} onPress={() => toggleSave(`night:${night.id}`)} /><ExternalButton label="View venue announcement" url={night.source} /><T muted style={{ fontSize: 12, lineHeight: 20 }}>Check the venue for current dates, entry conditions, and changes. Saving does not reserve admission.</T></Card><VenueCard venue={venue} /><View style={{ gap: 7, paddingHorizontal: 6 }}><T muted style={{ fontSize: 11, lineHeight: 18 }}>Source: {new URL(night.source).hostname.replace('www.', '')}</T><T muted style={{ fontSize: 11, lineHeight: 18 }}>Editorial check · {nightlifeChecked}</T></View></View>
    </View>
    <View style={{ gap: 18, marginTop: 12 }}><SectionTitle title="More nights" /><View style={{ flexDirection: compact ? 'column' : 'row', gap: 20 }}>{nights.filter(n => n.id !== night.id).slice(0, 2).map(n => <View key={n.id} style={{ flex: 1 }}><NightCard night={n} /></View>)}</View></View>
  </></NightlifeAgeBoundary>;
}
