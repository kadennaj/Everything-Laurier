import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Empty, ExternalButton, Icon, PageHeading, SaveButton, T, body, s } from '../../components/ui';
import { clubs, directorySource, initials, themeColors } from '../../data/content';
import { colors as c, fonts as f } from '../../lib/theme';

export default function ClubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const club = clubs.find(item => item.id === id);
  if (!club) return <Empty title="This club isn’t in the directory." description="Head back to the directory to explore a different club." action={<Button label="Back to clubs" onPress={() => router.replace('/clubs')} />} />;
  return <><View style={{ alignItems: 'flex-start' }}><Button label="All clubs" icon="arrow-left" secondary onPress={() => router.replace('/clubs')} /></View>
    <Card style={{ padding: 28, gap: 23 }}><View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ width: 79, height: 79, borderRadius: 24, backgroundColor: themeColors[club.theme], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: f.bold, fontSize: 28, color: c.purple }}>{initials(club.name)}</T></View><SaveButton id={`club:${club.id}`} title={club.name} /></View><PageHeading eyebrow={`${club.group.toUpperCase()} · WATERLOO`} title={club.name} /><View style={[s.row, { gap: 9, flexWrap: 'wrap' }]}><Badge label={club.theme} color={themeColors[club.theme]} /><Badge label="Official directory listing" color={c.sage} textColor={c.green} /></View><T style={body}>Find activities and contact details through the club’s official links.</T><View style={{ alignItems: 'flex-start', gap: 12 }}>{club.instagram ? <ExternalButton label="Open Instagram" url={club.instagram} secondary={false} /> : null}<ExternalButton label="View Students’ Union directory" url={directorySource} /></View></Card>
    <View style={[s.row, { gap: 9 }]}><Icon name="info" size={15} color={c.muted} /><T muted style={{ flex: 1, fontSize: 12, lineHeight: 20 }}>Saved clubs stay on this device. No membership request is sent when you save a club.</T></View>
  </>;
}
