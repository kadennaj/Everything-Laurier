import React, { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ClubCard } from '../components/cards';
import { Button, Chips, Empty, ExternalButton, PageHeading, Search, T, s } from '../components/ui';
import { clubs, directorySource, themes } from '../data/content';

export default function Clubs() {
  const [query, setQuery] = useState(''); const [theme, setTheme] = useState('All clubs'); const [limit, setLimit] = useState(18); const { width, fontScale } = useWindowDimensions(); const layoutWidth = width / fontScale;
  const filtered = useMemo(() => clubs.filter(club => (theme === 'All clubs' || club.theme === theme) && club.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [query, theme]);
  return <><PageHeading title="Clubs" />
    <Search value={query} onChange={value => { setQuery(value); setLimit(18); }} placeholder="Search clubs…" />
    <Chips items={themes} value={theme} onChange={value => { setTheme(value); setLimit(18); }} />
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 9 }]}><T muted style={{ fontSize: 12 }}>{filtered.length} {filtered.length === 1 ? 'club' : 'clubs'}</T><T muted style={{ fontSize: 11 }}>Directory updated Sep 24, 2026</T></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>{filtered.slice(0, limit).map(club => <View key={club.id} style={{ width: layoutWidth < 650 ? '100%' : undefined, flexBasis: layoutWidth < 650 ? undefined : layoutWidth >= 1200 ? '30%' : '46%', flexGrow: 1, maxWidth: layoutWidth < 650 ? undefined : layoutWidth >= 1200 ? '32%' : '49%' }}><ClubCard club={club} compact /></View>)}</View>
    {!filtered.length && <Empty title="No matching clubs" description="Try another name or clear the filters." action={<Button label="Reset filters" onPress={() => { setQuery(''); setTheme('All clubs'); }} />} />}
    {filtered.length > limit && <View style={{ alignItems: 'center' }}><Button secondary label="Show more" onPress={() => setLimit(n => n + 18)} /></View>}
    <View style={{ alignItems: 'flex-start', gap: 10 }}><T muted style={{ fontSize: 12, lineHeight: 20 }}>Students’ Union directory · Categories curated by this app</T><ExternalButton label="Official directory" url={directorySource} /></View>
  </>;
}
