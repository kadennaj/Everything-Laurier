import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Tutoring } from '../components/Tutoring';
import { useWindowDimensions, View } from 'react-native';
import { Badge, Card, Chips, ExternalButton, Icon, IconName, PageHeading, T } from '../components/ui';
import { resources } from '../data/content';
import { colors as c, fonts as f } from '../lib/theme';

export default function Help() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const tab = section === 'tutoring' ? 'Peer tutoring' : 'Campus support';
  const { width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 700;
  return <><PageHeading title="Academic help" subtitle={tab==='Campus support'?"Find academic and personal support through Laurier’s official resources.":"Find course-specific peer tutors or apply to become one."} />
    <Chips items={['Campus support', 'Peer tutoring']} value={tab} onChange={value => router.setParams({ section: value === 'Peer tutoring' ? 'tutoring' : 'campus' })} />
    {tab === 'Campus support' ? <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{resources.map(resource => <Card key={resource.id} style={{ flexGrow: 1, flexBasis: compact ? '100%' : '30%', maxWidth: compact ? undefined : 460, padding: 25, gap: 18 }}><View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: resource.color, alignItems: 'center', justifyContent: 'center' }}><Icon name={resource.icon as IconName} color={c.purple} size={26} /></View><Badge label={resource.tag} color={resource.color} /><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 20, lineHeight: 27 }}>{resource.title}</T><T style={{ fontFamily: f.medium, fontSize: 18, lineHeight: 26 }}>{resource.subtitle}</T><T muted style={{ lineHeight: 25, fontSize: 16, flex: 1 }}>{resource.description}</T><ExternalButton label="Explore official support" url={resource.url} /></Card>)}</View><View style={{ backgroundColor: c.sage, padding: 25, borderRadius: 16, gap: 10 }}><T style={{ fontFamily: f.bold, fontSize: 24 }}>Asking for help is a good move.</T><T muted style={{ lineHeight: 23, maxWidth: 680 }}>These links take you directly to Laurier. Check the official pages for current availability, eligibility, and appointment details.</T></View></> : <Tutoring />}
  </>;
}
