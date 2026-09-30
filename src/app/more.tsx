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
];
export default function More() {
  return <><PageHeading eyebrow="THE REST OF YOUR CAMPUS" title="There’s more to your day." subtitle="A new connection, a little support, or something you saved for later." /><View style={{ gap: 14 }}>{links.map(link => <Card key={link.title}><Pressable accessibilityRole="button" onPress={() => router.push(link.path)} style={({ pressed }) => [s.row, { gap: 20, padding: 24, opacity: pressed ? 0.7 : 1 }]}><View style={{ padding: 15, backgroundColor: c.lavender, borderRadius: 16 }}><Icon name={link.icon} color={c.purple} /></View><View style={{ flex: 1, gap: 7 }}><T style={{ fontFamily: f.serif, fontSize: 24 }}>{link.title}</T><T muted style={{ lineHeight: 21 }}>{link.description}</T></View><Icon name="chevron-right" color={c.muted} /></Pressable></Card>)}</View></>;
}
