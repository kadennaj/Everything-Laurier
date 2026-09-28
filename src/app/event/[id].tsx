import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Artwork } from '../../components/Artwork';
import { Badge, Button, Card, Empty, Eyebrow, Icon, T, body, s } from '../../components/ui';
import { events } from '../../data/content';
import { useLocal } from '../../lib/state';
import { colors as c, fonts as f } from '../../lib/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const event = events.find(item => item.id === id); const { saved, toggleSave } = useLocal(); const { width } = useWindowDimensions();
  if (!event) return <Empty title="This plan isn’t in the preview." description="Discover something else from the home screen." action={<Button label="Back to Discover" onPress={() => router.replace('/')} />} />;
  const active = saved.includes(`event:${event.id}`);
  return <><View style={{ alignItems: 'flex-start' }}><Button secondary icon="arrow-left" label="Back to Discover" onPress={() => router.replace('/')} /></View>
    <Card><Artwork kind={event.art} height={width < 600 ? 230 : 310} /><View style={{ padding: width < 600 ? 23 : 32, gap: 22 }}><View style={[s.row, { gap: 10 }]}><Badge label={event.category} color={c.peach} /></View><T accessibilityRole="header" style={{ fontFamily: f.serif, fontSize: width < 600 ? 32 : 40, lineHeight: width < 600 ? 40 : 49, maxWidth: 750 }}>{event.title}</T><T muted>By {event.host}</T><View style={{ height: 1, backgroundColor: c.border }} /><View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 25 }}><View style={[s.row, { gap: 12 }]}><Icon name="calendar" color={c.purple} /><View><T style={{ fontFamily: f.bold }}>{event.weekday}, September {event.day}</T><T muted style={{ marginTop: 5 }}>{event.time} · Sample schedule</T></View></View><View style={[s.row, { gap: 12 }]}><Icon name="map-pin" color={c.purple} /><View><T style={{ fontFamily: f.bold }}>{event.place}</T><T muted style={{ marginTop: 5 }}>Illustrative location</T></View></View></View><Eyebrow>THE IDEA</Eyebrow><T style={[body, { maxWidth: 750 }]}>{event.description}</T><T style={body}>{event.note}</T><View style={{ alignItems: 'flex-start', gap: 15 }}><Button icon={active ? 'check' : 'bookmark'} label={active ? 'Saved — tap to remove' : 'Save this event'} onPress={() => toggleSave(`event:${event.id}`)} /><T muted style={{ fontSize: 12, lineHeight: 20 }}>This is an example, not a real scheduled event. Saving it only updates your local preview.</T></View></View></Card>
  </>;
}
