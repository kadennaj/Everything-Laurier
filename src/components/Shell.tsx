import { Href, router, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  const contentOpacity = useState(() => new Animated.Value(1))[0];
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    contentOpacity.stopAnimation();
    if (reduceMotion) { contentOpacity.setValue(1); return; }
    contentOpacity.setValue(0.7);
    const animation = Animated.timing(contentOpacity, { toValue: 1, duration: 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [pathname, reduceMotion, contentOpacity]);
  const goSearch = () => { router.push({ pathname: '/search', params: { q: query } }); setQuery(''); };

  return <View style={[styles.root, { paddingTop: insets.top }]}>
    {desktop && <View style={styles.sidebar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
        <View style={styles.brandMark}><Icon name="feather" color={c.purple} size={24} /></View>
        <View><T style={styles.brandSmall}>EVERYTHING</T><T style={styles.brandName}>Laurier.</T></View>
      </Pressable>
      <T style={styles.sidebarLabel}>EXPLORE</T>
      <View style={{ gap: 5 }}>{navigation.map(item => {
        const active = current === item.label;
        return <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.sideLink, active && styles.sideLinkActive, pressed && styles.pressed]}>
          <Icon name={item.icon} size={20} color={active ? c.purple : c.muted} />
          <T style={[styles.sideText, active && styles.sideTextActive]}>{item.label}</T>
        </Pressable>;
      })}</View>
      <View style={styles.sideRule} />
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/saved')} style={({ pressed }) => [styles.sideLink, pathname === '/saved' && styles.sideLinkActive, pressed && styles.pressed]}>
        <Icon name="bookmark" size={20} color={pathname === '/saved' ? c.purple : c.muted} />
        <T style={[styles.sideText, pathname === '/saved' && styles.sideTextActive]}>Saved items</T>
        {!!saved.length && <T style={{ color: c.purple, fontFamily: f.medium }}>{saved.length}</T>}
      </Pressable>
      <View style={{ flex: 1 }} />
      <View style={styles.sideFooter}><T muted style={{ fontSize: 12 }}>Laurier · Waterloo</T></View>
      <Pressable accessibilityRole="button" onPress={() => router.push(session || !ready ? '/profile' : '/login')} style={({ pressed }) => [styles.sideLink, pressed && styles.pressed]}><Icon name="user" size={19} color={c.muted} /><T style={styles.sideText}>{session ? 'Your account' : 'Sign in'}</T></Pressable>
    </View>}

    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={[styles.topbar, { paddingHorizontal: desktop ? 40 : 20 }]}>
        {desktop ? <T style={{ color: c.ink, fontSize: 16, fontFamily: f.medium }}>{current}</T> : <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.mobileBrand, pressed && styles.pressed]}><View style={styles.mobileMark}><Icon name="feather" color={c.purple} size={20} /></View><T numberOfLines={1} style={{ fontFamily: f.bold, fontSize: width < 390 ? 16 : 18, letterSpacing: -0.4, flexShrink: 1 }}>Everything Laurier</T></Pressable>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {desktop && <Search value={query} onChange={setQuery} onSubmit={goSearch} placeholder="Search campus…" style={{ width: width >= 1280 ? 280 : 220, backgroundColor: c.background }} />}
          {!desktop && <IconButton name="search" label="Search Everything Laurier" onPress={() => router.push('/search')} />}
          <IconButton name={session ? 'user-check' : 'user'} label={session ? 'Your account' : 'Sign in'} onPress={() => router.push(session || !ready ? '/profile' : '/login')} style={{ backgroundColor: c.lavender }} />
        </View>
      </View>
      <ScrollView key={pathname} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: desktop ? 40 : 20, paddingTop: desktop ? 36 : 24, paddingBottom: desktop ? 48 : 32, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ width: '100%', maxWidth: 1120, gap: desktop ? 36 : 28, opacity: contentOpacity }}>{children}</Animated.View>
      </ScrollView>
      {!desktop && <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 7) }]}>{navigation.map(item => {
        const active = current === item.label;
        return <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.bottomItem, pressed && styles.pressed]}>
          <View style={[styles.bottomIcon, active && styles.bottomIconActive]}><Icon name={item.icon} size={20} color={active ? c.purple : c.muted} /></View>
          <T style={{ color: active ? c.purple : c.muted, fontFamily: active ? f.bold : f.medium, fontSize: 11, lineHeight: 16 }}>{item.label}</T>
        </Pressable>;
      })}</View>}
      {!!toast && <View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.toast, { bottom: desktop ? 28 : 82 + insets.bottom }]}><Icon name="check-circle" color={c.gold} size={18} /><T style={{ color: c.surface, fontSize: 13, flexShrink: 1 }}>{toast}</T></View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: c.background, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  pressed: { opacity: 0.72 },
  sidebar: { width: 232, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, backgroundColor: c.surface, borderRightWidth: 1, borderRightColor: c.border },
  brand: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 8, marginBottom: 28 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center' },
  brandSmall: { color: c.muted, fontFamily: f.bold, fontSize: 9, letterSpacing: 1 },
  brandName: { color: c.ink, fontFamily: f.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.4 },
  sidebarLabel: { color: c.muted, fontFamily: f.bold, fontSize: 10, letterSpacing: 1, marginLeft: 16, marginBottom: 13 },
  sideLink: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, borderRadius: 13 },
  sideLinkActive: { backgroundColor: c.lavender },
  sideText: { flex: 1, color: c.muted, fontFamily: f.medium, fontSize: 14 },
  sideTextActive: { color: c.purple, fontFamily: f.bold },
  sideRule: { height: 1, backgroundColor: c.border, marginHorizontal: 14, marginVertical: 19 },
  sideFooter: { paddingHorizontal: 16, paddingVertical: 18 },
  topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  mobileBrand: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  mobileMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center' },
  bottomNav: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 6, paddingTop: 6 },
  bottomItem: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  bottomIcon: { width: 48, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bottomIconActive: { backgroundColor: c.lavender },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: c.purpleDark, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '90%' },
});
