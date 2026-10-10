import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Artwork } from '../../components/Artwork';
import { Badge, Button, Card, Empty, ExternalButton, Eyebrow, Icon, T, body, s } from '../../components/ui';
import { CalendarStatus } from '../../components/CalendarStatus';
import { useOfficialEvents } from '../../lib/official-events';
import { useLocal } from '../../lib/state';
import { colors as c, fonts as f } from '../../lib/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { events, loading, error, now } = useOfficialEvents(); const event = events.find(item => item.id === id); const { saved, toggleSave } = useLocal(); const { width } = useWindowDimensions();
  if (!event) return <><CalendarStatus />{!loading && !error && <Empty title="This event is no longer listed." description="The organizer may have removed it or its listing may have expired." />}
    {saved.includes(`event:${id}`) && <Button secondary label="Remove saved bookmark" onPress={() => toggleSave(`event:${id}`)} />}
    <Button label="Back to Discover" onPress={() => router.replace('/')} /></>;
  const active = saved.includes(`event:${event.id}`);
  return <><View style={{ alignItems: 'flex-start' }}><Button secondary icon="arrow-left" label="Back to Discover" onPress={() => router.replace('/')} /></View>
    <Card><Artwork kind={event.art} height={width < 600 ? 150 : 180} showLabels={false} />
      <View style={{ padding: width < 600 ? 23 : 32, gap: 22 }}>
        <View style={[s.row, { gap: 10 }]}><Badge label={event.category} color={c.peach} /></View>
        <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: width < 600 ? 32 : 40, lineHeight: width < 600 ? 40 : 49, maxWidth: 750 }}>{event.title}</T>
        {!!event.host && <T muted>By {event.host}</T>}
        <View style={{ height: 1, backgroundColor: c.border }} />
        <View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 25 }}>
          <View style={[s.row, { gap: 12, flexShrink: 1 }]}><Icon name="calendar" color={c.purple} /><View style={{ flexShrink: 1 }}><T style={{ fontFamily: f.bold }}>{event.dateLabel}</T><T muted style={{ marginTop: 5 }}>{event.schedule}</T><T muted style={{ marginTop: 5, fontSize: 12 }}>Waterloo time{Date.parse(event.endsAt) < now ? ' · Past event' : ''}</T></View></View>
          {!!event.place && <View style={[s.row, { gap: 12, flexShrink: 1 }]}><Icon name="map-pin" color={c.purple} /><T style={{ fontFamily: f.bold, flexShrink: 1 }}>{event.place}</T></View>}
        </View>
        {!!event.cost && <T style={body}>{event.cost}</T>}
        {!!event.description && <><Eyebrow>ABOUT THE EVENT</Eyebrow><T style={[body, { maxWidth: 750 }]}>{event.description}</T></>}
        <View style={{ alignItems: 'flex-start', gap: 15 }}><ExternalButton label="Official listing & tickets" url={event.sourceUrl} /><Button icon={active ? 'check' : 'bookmark'} label={active ? 'Saved — tap to remove' : 'Save this event'} onPress={() => toggleSave(`event:${event.id}`)} /><T muted style={{ fontSize: 12, lineHeight: 20 }}>Confirm registration, location and schedule on Laurier’s official listing. Saving keeps a bookmark on this device.</T></View>
        <CalendarStatus />
      </View>
    </Card>
  </>;
}
