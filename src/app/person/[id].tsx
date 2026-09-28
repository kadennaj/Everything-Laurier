import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Empty, Eyebrow, T, body, s } from '../../components/ui';
import { people } from '../../data/content';
import { colors as c, fonts as f } from '../../lib/theme';

export default function PersonPage() {
  const { id } = useLocalSearchParams<{ id: string }>(); const person = people.find(p => p.id === id);
  if (!person) return <Empty title="Profile not found." description="Explore the sample profiles in People." action={<Button label="Back to People" onPress={() => router.replace('/people')} />} />;
  return <><View style={{ alignItems: 'flex-start' }}><Button label="Back to People" secondary icon="arrow-left" onPress={() => router.replace('/people')} /></View><Card style={{ padding: 30, gap: 24 }}><View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ width: 86, height: 86, borderRadius: 28, backgroundColor: person.color, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: c.purple, fontFamily: f.serif, fontSize: 32 }}>{person.initials}</T></View><Badge label="FICTIONAL PROFILE" /></View><View style={{ gap: 10 }}><T accessibilityRole="header" style={{ fontFamily: f.serif, fontSize: 38 }}>{person.name}</T><T muted>{person.program} · {person.year}</T></View><Eyebrow>A LITTLE ABOUT ME</Eyebrow><T style={body}>{person.bio}</T><Eyebrow>LET’S TALK ABOUT</Eyebrow><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{person.interests.map(tag => <Badge key={tag} label={tag} color={person.color} />)}</View><View style={{ padding: 20, backgroundColor: c.background, borderRadius: 13, gap: 8 }}><T style={{ fontFamily: f.bold }}>Looking for: {person.looking.toLowerCase()}</T><T style={{ fontSize: 12, lineHeight: 21, color: c.muted }}>This is a sample profile for reviewing the design. No student identity, LinkedIn account, or messaging is connected.</T></View></Card></>;
}
