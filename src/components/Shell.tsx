import { Href, router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c, fonts as f } from '../lib/theme';
import { useLocal } from '../lib/state';
import { Icon, IconButton, IconName, Search, T, s } from './ui';

const navigation: { label: string; path: Href; icon: IconName }[] = [
  { label: 'Discover', path: '/', icon: 'compass' }, { label: 'Clubs', path: '/clubs', icon: 'grid' },
  { label: 'Map', path: '/map', icon: 'map' }, { label: 'People', path: '/people', icon: 'users' }, { label: 'Help', path: '/help', icon: 'book-open' },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions(); const desktop = width >= 1000; const pathname = usePathname();
  const insets = useSafeAreaInsets(); const { saved, toast } = useLocal(); const [query, setQuery] = useState('');
  const current = navigation.find(item => item.path === pathname)?.label ?? (pathname.startsWith('/club/') ? 'Clubs' : pathname.startsWith('/event/') ? 'Discover' : pathname.slice(1).replace(/^./, c => c.toUpperCase()));
  const goSearch = () => { router.push({ pathname: '/search', params: { q: query } }); setQuery(''); };
  return <View style={[styles.root, { paddingTop: insets.top }]}>
    {desktop && <View style={styles.sidebar}>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" accessibilityLabel="Everything Laurier home" style={[s.row, { gap: 12, paddingHorizontal: 13, paddingVertical: 16, marginBottom: 34 }]}><View style={styles.logo}><Icon name="feather" color={c.gold} size={26} /></View><View><T style={{ fontFamily: f.bold, fontSize: 16, lineHeight: 19 }}>Everything</T><T style={{ fontFamily: f.serif, fontSize: 21, color: c.purple }}>Laurier.</T></View></Pressable>
      <T style={styles.navLabel}>YOUR CAMPUS, CONNECTED</T>
      {navigation.map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: current === item.label }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.nav, current === item.label && styles.navActive, pressed && { opacity: 0.65 }]}><Icon name={item.icon} size={20} color={current === item.label ? c.purple : c.muted} /><T style={{ fontFamily: current === item.label ? f.bold : f.medium, color: current === item.label ? c.purple : c.muted, fontSize: 14 }}>{item.label}</T>{current === item.label && <View style={styles.activeDot} />}</Pressable>)}
      <View style={styles.divider} />
      <Pressable accessibilityRole="button" accessibilityLabel="Saved items" onPress={() => router.navigate('/saved')} style={[styles.nav, pathname === '/saved' && styles.navActive]}><Icon name="bookmark" size={20} color={c.muted} /><T muted>Saved for later</T>{saved.length > 0 && <View style={styles.count}><T style={{ fontSize: 11, color: c.purple, fontFamily: f.bold }}>{saved.length}</T></View>}</Pressable>
      <View style={{ flex: 1 }} />
      <View style={styles.sidebarNote}><Icon name="sun" size={26} color={c.purple} /><T style={{ fontFamily: f.serif, fontSize: 19, lineHeight: 26 }}>A little more campus.\nA little more you.</T><T muted style={{ fontSize: 12, lineHeight: 19 }}>Made for the moments\nbetween your classes.</T></View>
      <Pressable accessibilityRole="button" accessibilityLabel="About this preview" onPress={() => router.navigate('/profile')} style={[s.row, { gap: 8, padding: 14 }]}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9B7AB5' }} /><T muted style={{ fontSize: 11 }}>Design preview · Waterloo</T></Pressable>
    </View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={[styles.topbar, { paddingHorizontal: desktop ? 36 : 20 }]}>
        {desktop ? <View style={[s.row, { gap: 11 }]}><T muted style={{ fontSize: 12 }}>Campus life</T><T muted>/</T><T style={{ fontSize: 12, fontFamily: f.medium }}>{current || 'Discover'}</T></View> : <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={[s.row, { gap: 9, minHeight: 44 }]}><View style={[styles.logo, { width: 30, height: 33, borderRadius: 10 }]}><Icon name="feather" color={c.gold} size={19} /></View><T style={{ fontFamily: f.serif, color: c.purple, fontSize: 21 }}>Everything Laurier.</T></Pressable>}
        <View style={[s.row, { gap: desktop ? 18 : 4 }]}>{desktop && <Search value={query} onChange={setQuery} onSubmit={goSearch} placeholder="Find your next thing…" style={{ width: width >= 1280 ? 270 : 215, minHeight: 44, backgroundColor: c.background }} />}{desktop && <Pressable onPress={() => router.navigate('/map')} accessibilityRole="button" accessibilityLabel="Waterloo campus map" style={[s.row, { gap: 6, minHeight: 44 }]}><Icon name="map-pin" size={15} color={c.purple} /><T style={{ fontFamily: f.medium, fontSize: 12 }}>Waterloo</T></Pressable>}{!desktop && <IconButton name="search" label="Search Everything Laurier" onPress={() => router.push('/search')} />}<IconButton name="user" label="Your space" onPress={() => router.push('/profile')} style={{ backgroundColor: c.lavender }} /></View>
      </View>
      <ScrollView key={pathname} style={{ flex: 1 }} contentContainerStyle={{ padding: desktop ? 36 : 20, paddingBottom: 40, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 1280, gap: 28 }}>{children}<View style={[s.row, { paddingTop: 24, borderTopWidth: 1, borderTopColor: c.border, flexWrap: 'wrap', gap: 7, marginTop: 12 }]}><Icon name="feather" size={14} color={c.purple} /><T muted style={{ fontSize: 11 }}>A little closer to your campus.</T><View style={{ flex: 1 }} /><Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={{ paddingVertical: 14 }}><T muted style={{ fontSize: 11 }}>UI preview · Local saves only</T></Pressable></View></View>
      </ScrollView>
      {!desktop && <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 9) }]}>{navigation.map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: current === item.label }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.bottomItem, pressed && { opacity: 0.6 }]}><View style={[styles.mobileIcon, current === item.label && { backgroundColor: c.lavender }]}><Icon name={item.icon} size={21} color={current === item.label ? c.purple : c.muted} /></View><T style={{ fontSize: 10, fontFamily: current === item.label ? f.bold : f.medium, color: current === item.label ? c.purple : c.muted }}>{item.label}</T></Pressable>)}</View>}
      {!!toast && <View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.toast, { bottom: desktop ? 30 : 88 + insets.bottom }]}><Icon name="check-circle" color={c.gold} size={17} /><T style={{ color: '#FFF', fontSize: 13, flexShrink: 1 }}>{toast}</T></View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: c.background, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  sidebar: { width: 224, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#FDFCFB', borderRightWidth: 1, borderRightColor: c.border },
  logo: { width: 41, height: 45, backgroundColor: c.purple, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 8, letterSpacing: 1.5, fontFamily: f.bold, color: '#908995', paddingHorizontal: 14, marginBottom: 14 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, minHeight: 50, borderRadius: 10, marginBottom: 5 },
  navActive: { backgroundColor: c.lavender }, activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.purple, marginLeft: 'auto' },
  divider: { height: 1, backgroundColor: c.border, marginHorizontal: 14, marginVertical: 21 },
  count: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: c.lavender, borderRadius: 5, marginLeft: 'auto' },
  sidebarNote: { padding: 17, borderRadius: 15, backgroundColor: '#F2EEE6', gap: 13, marginBottom: 14, marginTop: 22 },
  topbar: { height: 81, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#FDFCFB', borderBottomWidth: 1, borderBottomColor: c.border },
  bottomNav: { flexDirection: 'row', paddingTop: 7, paddingHorizontal: 9, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  bottomItem: { flex: 1, minHeight: 53, alignItems: 'center', justifyContent: 'center', gap: 4 }, mobileIcon: { width: 43, height: 29, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: c.purpleDark, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '90%', boxShadow: '0px 5px 20px rgba(35,20,50,0.16)' },
});
