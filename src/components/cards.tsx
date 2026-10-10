import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { CampusEvent, Club, initials } from '../data/content';
import { colors as c, fonts as f } from '../lib/theme';
import { Artwork } from './Artwork';
import { Badge, Card, Icon, SaveButton, T, s } from './ui';

export function EventCard({ event }: { event: CampusEvent }) {
  return <Card><View>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${event.shortTitle}`} onPress={() => router.push(`/event/${event.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}><Artwork kind={event.art} height={120} showLabels={false} /><View style={{ position: 'absolute', left: 20, top: 22, gap: 4 }}><T style={{ fontSize: 12, fontFamily: f.medium }}>{event.month}</T><T style={{ fontSize: 32, fontFamily: f.bold }}>{event.day}</T></View></Pressable>
    <SaveButton id={`event:${event.id}`} title={event.shortTitle} style={{ position: 'absolute', right: 12, top: 12 }} />
  </View><Pressable accessibilityRole="button" accessibilityLabel={`Details for ${event.shortTitle}`} onPress={() => router.push(`/event/${event.id}`)} style={({ pressed }) => ({ padding: 20, gap: 12, opacity: pressed ? 0.7 : 1 })}>
    <View style={[s.row, { gap: 10, justifyContent: 'space-between' }]}><Badge label={event.category} />{event.cost ? <T style={{ fontSize: 12, color: c.green, fontFamily: f.medium }}>{event.cost}</T> : null}</View>
    <T style={{ fontFamily: f.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.4 }}>{event.shortTitle}</T>
    <View style={[s.row, { gap: 8 }]}><Icon name="calendar" size={15} color={c.muted} /><T muted style={{ fontSize: 13, flex: 1 }}>{[event.dateLabel, event.time].filter(Boolean).join(' · ')}</T></View>
    {event.place ? <View style={[s.row, { gap: 8 }]}><Icon name="map-pin" size={15} color={c.muted} /><T muted style={{ fontSize: 13, flex: 1 }}>{event.place}</T></View> : null}
  </Pressable></Card>;
}
export function ClubCard({ club }: { club: Club }) {
  return <Card style={{ height: '100%' }}><View style={{ padding: 22, gap: 18 }}>
    <View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: f.medium, fontSize: 17, color: c.purple }}>{initials(club.name)}</T></View><SaveButton id={`club:${club.id}`} title={club.name} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${club.name}`} onPress={() => router.push(`/club/${club.id}`)} style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.7 : 1, minHeight: 94 })}>
      <T style={{ fontFamily: f.bold, fontSize: 17, lineHeight: 25, letterSpacing: -0.3 }}>{club.name}</T>
      {club.group ? <T muted style={{ fontSize: 13 }}>{club.group}</T> : null}
      <View style={[s.row, { justifyContent: 'space-between', marginTop: 6 }]}><Badge label={club.theme} color={c.background} textColor={c.muted} /><Icon name="arrow-right" size={18} color={c.purple} /></View>
    </Pressable>
  </View></Card>;
}
