import { router, Href } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Icon, IconName, PageHeading, T, s } from '../components/ui';
import { colors as c, fonts as f } from '../lib/theme';

const links: { title: string; description: string; path: Href; icon: IconName }[] = [
  { title: 'People', description: 'Connections beyond your usual circle.', path: '/people', icon: 'users' },
  { title: 'Academic help', description: 'Campus support and a little direction.', path: '/help', icon: 'book-open' },
  { title: 'Saved for later', description: 'Your clubs, places, and next good plans.', path: '/saved', icon: 'bookmark' },
  { title: 'Your space', description: 'Your account, preferences, and Everything Laurier.', path: '/profile', icon: 'user' },
  { title: 'Community & support', description: 'Report concerns, manage sources, and get help.', path: '/community', icon: 'flag' },
  { title: 'Privacy policy', description: 'Your information and your choices.', path: '/privacy', icon: 'shield' },
];
export default function More() {
  return <><PageHeading eyebrow="EVERYTHING ELSE" title="More for you." subtitle="The useful things, all in one place." /><View style={{ gap: 10 }}>{links.map(link => <Card key={link.title}><Pressable accessibilityRole="button" onPress={() => router.push(link.path)} style={({ pressed }) => [s.row, { gap: 15, minHeight: 82, paddingHorizontal: 17, paddingVertical: 13, opacity: pressed ? 0.7 : 1 }]}><View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: c.lavender, borderRadius: 14 }}><Icon name={link.icon} color={c.purple} /></View><View style={{ flex: 1, gap: 4 }}><T style={{ fontFamily: f.bold, fontSize: 16 }}>{link.title}</T><T muted style={{ lineHeight: 18, fontSize: 12 }}>{link.description}</T></View><Icon name="chevron-right" size={19} color={c.purple} /></Pressable></Card>)}</View></>;
}
