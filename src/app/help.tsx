import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Badge, Button, Card, Chips, Empty, ExternalButton, Icon, IconName, PageHeading, T } from '../components/ui';
import { resources } from '../data/content';
import { colors as c, fonts as f } from '../lib/theme';

export default function Help() {
  const [tab, setTab] = useState('Campus support'); const { width } = useWindowDimensions();
  return <><PageHeading eyebrow="YOU DON’T HAVE TO FIGURE IT ALL OUT ALONE" title="A little help goes a long way." subtitle="From the assignment you’re stuck on to the support you didn’t know was there. Start with Laurier’s official resources." />
    <Chips items={['Campus support', 'Student tutors']} value={tab} onChange={setTab} />
    {tab === 'Campus support' ? <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{resources.map(resource => <Card key={resource.id} style={{ flexGrow: 1, flexBasis: width < 650 ? '100%' : '30%', maxWidth: width < 650 ? undefined : 460, padding: 25, gap: 18 }}><View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: resource.color, alignItems: 'center', justifyContent: 'center' }}><Icon name={resource.icon as IconName} color={c.purple} size={26} /></View><Badge label={resource.tag} color={resource.color} /><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 20, lineHeight: 27 }}>{resource.title}</T><T style={{ fontFamily: f.serif, fontSize: 18, lineHeight: 26 }}>{resource.subtitle}</T><T muted style={{ lineHeight: 23, fontSize: 13, flex: 1 }}>{resource.description}</T><ExternalButton label="Explore official support" url={resource.url} /></Card>)}</View><View style={{ backgroundColor: c.sage, padding: 25, borderRadius: 16, gap: 10 }}><T style={{ fontFamily: f.serif, fontSize: 24 }}>Asking for help is a good move.</T><T muted style={{ lineHeight: 23, maxWidth: 680 }}>These links take you directly to Laurier. Check the official pages for current availability, eligibility, and appointment details.</T></View></> : <Card><Empty icon="book-open" title="Your study team is taking shape." description="Student tutor listings are part of the future app. For now, explore official academic support — no tutor profiles or bookings are connected." action={<Button label="Explore campus support" onPress={() => setTab('Campus support')} />} /></Card>}
  </>;
}
