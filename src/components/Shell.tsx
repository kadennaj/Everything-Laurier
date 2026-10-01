import { Href, router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { useLocal } from '../lib/state';
import { colors as c, fonts as f } from '../lib/theme';
import { Icon, IconButton, IconName, Search, T } from './ui';

const navigation: { label: string; path: Href; icon: IconName }[] = [
  { label: 'Discover', path: '/', icon: 'compass' },
  { label: 'Nightlife', path: '/nightlife', icon: 'moon' },
  { label: 'Clubs', path: '/clubs', icon: 'grid' },
  { label: 'Map', path: '/map', icon: 'map' },
  { label: 'More', path: '/more', icon: 'menu' },
];

function currentSection(pathname: string) {
  const direct = navigation.find(item => item.path === pathname);
  if (direct) return direct.label;
  if (pathname.startsWith('/night/') || pathname.startsWith('/venue/')) return 'Nightlife';
  if (pathname.startsWith('/club/')) return 'Clubs';
  if (pathname.startsWith('/event/')) return 'Discover';
  return 'More';
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const pathname = usePathname();
  const current = currentSection(pathname);
  const insets = useSafeAreaInsets();
  const { session, ready } = useAuth();
  const { saved, toast } = useLocal();
  const [query, setQuery] = useState('');
  const goSearch = () => { router.push({ pathname: '/search', params: { q: query } }); setQuery(''); };

  return <View style={[styles.root, { paddingTop: insets.top }]}>
    {desktop && <View style={styles.sidebar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
        <View style={styles.brandMark}><Icon name="feather" color={c.purpleDark} size={24} /></View>
        <View><T style={styles.brandSmall}>EVERYTHING</T><T style={styles.brandName}>Laurier.</T></View>
      </Pressable>
      <T style={styles.sidebarLabel}>EXPLORE</T>
      <View style={{ gap: 5 }}>{navigation.map(item => {
        const active = current === item.label;
        return <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.sideLink, active && styles.sideLinkActive, pressed && styles.pressed]}>
          <Icon name={item.icon} size={20} color={active ? c.purpleDark : '#D4C6DF'} />
          <T style={[styles.sideText, active && styles.sideTextActive]}>{item.label}</T>
          {active && <Icon name="arrow-up-right" size={15} color={c.purple} />}
        </Pressable>;
      })}</View>
      <View style={styles.sideRule} />
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/saved')} style={({ pressed }) => [styles.sideLink, pathname === '/saved' && styles.sideLinkActive, pressed && styles.pressed]}>
        <Icon name="bookmark" size={20} color={pathname === '/saved' ? c.purpleDark : '#D4C6DF'} />
        <T style={[styles.sideText, pathname === '/saved' && styles.sideTextActive]}>Saved items</T>
        {!!saved.length && <T style={{ color: c.gold, fontFamily: f.bold }}>{saved.length}</T>}
      </Pressable>
      <View style={{ flex: 1 }} />
      <View style={styles.sideFooter}><T style={{ color: '#E9E0EE', fontFamily: f.serif, fontSize: 18, lineHeight: 25 }}>Your campus, in your pocket.</T><T style={{ color: '#C4B5CF', fontSize: 12, lineHeight: 19 }}>Waterloo, Ontario</T></View>
      <Pressable accessibilityRole="button" onPress={() => router.push(session || !ready ? '/profile' : '/login')} style={({ pressed }) => [styles.sideLink, pressed && styles.pressed]}><Icon name="user" size={19} color="#D4C6DF" /><T style={styles.sideText}>{session ? 'Your account' : 'Sign in'}</T></Pressable>
    </View>}

    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={[styles.topbar, { paddingHorizontal: desktop ? 34 : 18 }]}>
        {desktop ? <View style={{ gap: 2 }}><T style={{ color: c.muted, fontSize: 11, fontFamily: f.medium }}>EVERYTHING LAURIER</T><T style={{ color: c.ink, fontSize: 20, fontFamily: f.bold }}>{current}</T></View> : <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.mobileBrand, pressed && styles.pressed]}><View style={styles.mobileMark}><Icon name="feather" color={c.purple} size={20} /></View><T numberOfLines={1} style={{ fontFamily: f.bold, fontSize: width < 390 ? 16 : 18, letterSpacing: -0.5, flexShrink: 1 }}>Everything Laurier</T></Pressable>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {desktop && <Search value={query} onChange={setQuery} onSubmit={goSearch} placeholder="Search campus…" style={{ width: width >= 1280 ? 280 : 220, backgroundColor: c.background }} />}
          {!desktop && <IconButton name="search" label="Search Everything Laurier" onPress={() => router.push('/search')} />}
          <IconButton name={session ? 'user-check' : 'user'} label={session ? 'Your account' : 'Sign in'} onPress={() => router.push(session || !ready ? '/profile' : '/login')} style={{ backgroundColor: c.lavender }} />
        </View>
      </View>
      <ScrollView key={pathname} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: desktop ? 34 : 18, paddingTop: desktop ? 30 : 20, paddingBottom: desktop ? 48 : 34, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 1140, gap: desktop ? 30 : 24 }}>{children}<View style={styles.contentFooter}><Icon name="feather" size={15} color={c.purple} /><T muted style={{ fontSize: 12 }}>Made for life around Laurier.</T></View></View>
      </ScrollView>
      {!desktop && <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 7) }]}>{navigation.map(item => {
        const active = current === item.label;
        return <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.bottomItem, pressed && styles.pressed]}>
          <View style={[styles.bottomIcon, active && styles.bottomIconActive]}><Icon name={item.icon} size={20} color={active ? c.purple : c.muted} /></View>
          <T style={{ color: active ? c.purple : c.muted, fontFamily: active ? f.bold : f.medium, fontSize: 11 }}>{item.label}</T>
        </Pressable>;
      })}</View>}
      {!!toast && <View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.toast, { bottom: desktop ? 28 : 82 + insets.bottom }]}><Icon name="check-circle" color={c.gold} size={18} /><T style={{ color: c.surface, fontSize: 13, flexShrink: 1 }}>{toast}</T></View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: c.background, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  pressed: { opacity: 0.72 },
  sidebar: { width: 232, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, backgroundColor: c.purpleDark },
  brand: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 8, marginBottom: 28 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  brandSmall: { color: '#D8C8E5', fontFamily: f.bold, fontSize: 9, letterSpacing: 2 },
  brandName: { color: c.surface, fontFamily: f.serif, fontSize: 24, lineHeight: 29 },
  sidebarLabel: { color: '#BBA9C9', fontFamily: f.bold, fontSize: 10, letterSpacing: 1.7, marginLeft: 16, marginBottom: 13 },
  sideLink: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, borderRadius: 13 },
  sideLinkActive: { backgroundColor: c.surface },
  sideText: { flex: 1, color: '#E8DEEF', fontFamily: f.medium, fontSize: 14 },
  sideTextActive: { color: c.purpleDark, fontFamily: f.bold },
  sideRule: { height: 1, backgroundColor: '#4E3B5B', marginHorizontal: 14, marginVertical: 19 },
  sideFooter: { padding: 17, gap: 10, borderRadius: 16, backgroundColor: '#392748', marginBottom: 12 },
  topbar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  mobileBrand: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  mobileMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center' },
  bottomNav: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 6, paddingTop: 6 },
  bottomItem: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  bottomIcon: { width: 52, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bottomIconActive: { backgroundColor: c.lavender },
  contentFooter: { minHeight: 58, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: c.purpleDark, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '90%' },
});
