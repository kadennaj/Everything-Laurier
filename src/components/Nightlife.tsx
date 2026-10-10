import React from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { Night, NightPalette, Venue, getVenue } from '../data/nightlife';
import { colors as c, fonts as f } from '../lib/theme';
import { Badge, Card, Icon, SaveButton, T, s } from './ui';

export const nightColors = {
  retro: { bg: '#292132', ink: '#F7DFA6', accent: '#C89EBF' },
  crown: { bg: '#22392F', ink: '#EDE3BC', accent: '#A3BEA4' },
  pub: { bg: '#6E352D', ink: '#FFE5BB', accent: '#CF9272' },
  trivia: { bg: '#EBDDAD', ink: '#493B51', accent: '#AA875C' },
};

export function NightArt({ palette, title, subtitle, height = 200, hero = false }: { palette: NightPalette; title: string; subtitle: string; height?: number; hero?: boolean }) {
  const compact = useWindowDimensions().width < 600;
  const p = nightColors[palette];
  return <View style={{ minHeight: height, overflow: 'hidden', backgroundColor: p.bg, padding: hero ? (compact ? 20 : 28) : 23, justifyContent: 'space-between' }}>
    <Svg aria-hidden={true} width="100%" height="100%" viewBox="0 0 600 360" preserveAspectRatio="xMaxYMid slice" style={{ position: 'absolute', inset: 0, opacity: hero ? 0.8 : 0.62 }}>
      <G stroke={p.accent} fill="none" strokeWidth="1">
        {palette === 'retro' ? <><Line x1="458" y1="0" x2="458" y2="70" /><Circle cx="458" cy="154" r="83" /><Ellipse cx="458" cy="154" rx="56" ry="83" /><Ellipse cx="458" cy="154" rx="27" ry="83" />{[100, 126, 154, 182, 207].map(y => <Line key={y} x1={y === 154 ? 375 : 391} x2={y === 154 ? 541 : 525} y1={y} y2={y} />)}<Path d="M350 60v32m-16-16h32M555 239v40m-20-20h40M374 274v18m-9-9h18" /></> : palette === 'crown' ? <>{[0, 1, 2, 3, 4].map(n => <Path key={n} d={`M${335 + n * 19} 380 V${153 + n * 15} C${335 + n * 19} ${12 + n * 15} 605 ${12 + n * 15} 605 ${153 + n * 15} V380`} strokeWidth="2" />)}</> : palette === 'pub' ? <>{[70, 125, 180, 235, 290].map(y => <Path key={y} d={`M320 ${y} Q400 ${y - 100} 490 ${y} T680 ${y}`} strokeWidth="2" />)}</> : <>{[350, 415, 480, 545].map(x => <G key={x}><Circle cx={x} cy="75" r="20" /><Path d={`M${x - 20} 145h40v40h-40zM${x} 238l25 40h-50z`} /></G>)}</>}
      </G>
      <Circle cx="590" cy="350" r="120" fill={p.accent} opacity="0.08" />
    </Svg>
    <T style={{ color: p.ink, fontSize: 12, letterSpacing: 0.8, fontFamily: f.bold }}>{subtitle.toUpperCase()}</T>
    <T style={{ color: p.ink, fontFamily: f.bold, fontSize: hero ? (compact ? 34 : 43) : 30, lineHeight: hero ? (compact ? 44 : 53) : 40, letterSpacing: -0.4, maxWidth: hero ? 530 : 300, marginVertical: hero ? 12 : 25 }}>{title}</T>
    <View style={{ height: 1, width: 32, backgroundColor: p.accent }} />
  </View>;
}

export function NightCard({ night }: { night: Night }) {
  const venue = getVenue(night.venueId)!;
  return <Card style={{ height: '100%' }}><View><Pressable accessibilityRole="button" accessibilityLabel={`Explore ${night.title}`} onPress={() => router.push(`/night/${night.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}><NightArt palette={night.palette} title={night.artTitle} subtitle={venue.shortName} /></Pressable><SaveButton id={`night:${night.id}`} title={night.title} style={{ position: 'absolute', right: 14, top: 13 }} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Details for ${night.title}`} onPress={() => router.push(`/night/${night.id}`)} style={({ pressed }) => ({ padding: 22, gap: 14, opacity: pressed ? 0.7 : 1 })}>
      <View style={[s.row, { justifyContent: 'space-between', gap: 8 }]}><T style={{ color: c.purple, fontFamily: f.bold, fontSize: 12, letterSpacing: 0.3 }}>{night.schedule.toUpperCase()}</T><Badge label={night.genre} color={c.background} textColor={c.muted} /></View>
      <T style={{ fontFamily: f.bold, fontSize: 21, lineHeight: 28, letterSpacing: -0.4 }}>{night.title}</T><T muted style={{ fontSize: 13 }}>{venue.shortName} · {venue.area}</T>
      <View style={[s.row, { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 14, gap: 8 }]}><Icon name="clock" size={14} color={c.muted} /><T muted style={{ fontSize: 13, flex: 1 }}>{night.time}</T><Icon name="arrow-right" size={18} color={c.purple} /></View>
    </Pressable>
  </Card>;
}

export function VenueCard({ venue }: { venue: Venue }) {
  const p = nightColors[venue.palette];
  return <Card><View style={{ padding: 21, gap: 17 }}><View style={[s.row, { gap: 14 }]}><View style={{ width: 54, height: 59, borderRadius: 16, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: p.ink, fontFamily: f.bold, fontSize: 25 }}>{venue.monogram}</T></View><View style={{ flex: 1, gap: 5 }}><T style={{ fontFamily: f.bold, fontSize: 17 }}>{venue.shortName}</T><T muted style={{ fontSize: 12 }}>{venue.area}</T></View><SaveButton id={`venue:${venue.id}`} title={venue.shortName} /></View><Pressable accessibilityRole="button" accessibilityLabel={`Explore ${venue.name}`} onPress={() => router.push(`/venue/${venue.id}`)} style={({ pressed }) => ({ gap: 17, opacity: pressed ? 0.7 : 1 })}><T muted style={{ lineHeight: 23, minHeight: 46 }}>{venue.summary}</T><View style={[s.row, { justifyContent: 'space-between' }]}><Badge label={venue.kind} color={c.background} textColor={c.muted} /><Icon name="arrow-right" color={c.purple} size={19} /></View></Pressable></View></Card>;
}
