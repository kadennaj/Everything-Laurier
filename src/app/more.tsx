import { router, Href } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Card, NavigationRow, PageHeading, T } from '../components/ui';
import { colors as c, fonts as f } from '../lib/theme';

const groups: { title: string; items: { title: string; description: string; path: Href; icon: React.ComponentProps<typeof NavigationRow>['icon'] }[] }[] = [
  { title: 'Campus life', items: [
    { title: 'Academic help', description: 'Official academic and personal support', path: '/help', icon: 'book-open' },
    { title: 'Peer tutoring', description: 'Find a course tutor or apply to tutor', path: { pathname: '/help', params: { section: 'tutoring' } }, icon: 'award' },
    { title: 'People', description: 'Meet students in your program', path: '/people', icon: 'users' },
    { title: 'Saved items', description: 'Your clubs, places and campus events', path: '/saved', icon: 'bookmark' },
  ] },
  { title: 'Your account & support', items: [
    { title: 'Your space', description: 'Your account, profile and preferences', path: '/profile', icon: 'user' },
    { title: 'Community & support', description: 'Report a concern or get app help', path: '/community', icon: 'flag' },
    { title: 'Privacy policy', description: 'Your information and your choices', path: '/privacy', icon: 'shield' },
  ] },
];
export default function More() {
  return <><PageHeading title="Campus services" />{groups.map(group => <View key={group.title} style={{ gap: 12 }}><T accessibilityRole="header" style={{ color: c.muted, fontFamily: f.medium, fontSize: 14, lineHeight: 21 }}>{group.title}</T><Card>{group.items.map((item, index) => <NavigationRow key={item.title} title={item.title} description={item.description} icon={item.icon} last={index === group.items.length - 1} onPress={() => router.push(item.path)} />)}</Card></View>)}</>;
}
