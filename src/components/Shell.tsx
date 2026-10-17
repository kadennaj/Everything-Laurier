import { router, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocal } from '../lib/state';
import { colors as c, fonts as f } from '../lib/theme';
import { navigationSection, primaryNavigation, screenTitle } from '../lib/navigation';
import { Icon, IconButton, Search, T } from './ui';
import { BrandLogo } from './BrandLogo';

const services = [
  { label: 'Academic help', path: '/help', icon: 'book-open' },
  { label: 'People', path: '/people', icon: 'users' },
  { label: 'Saved items', path: '/saved', icon: 'bookmark' },
  { label: 'Campus services', path: '/more', icon: 'grid' },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { width, height, fontScale } = useWindowDimensions();
  const regular = width >= 1000 && width / fontScale >= 760;
  const pathname = usePathname();
  const current = navigationSection(pathname);
  const title = screenTitle(pathname);
  const primary = primaryNavigation.some(item => item.path === pathname);
  const insets = useSafeAreaInsets();
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
    contentOpacity.setValue(0.8);
    const animation = Animated.timing(contentOpacity, { toValue: 1, duration: 160, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [pathname, reduceMotion, contentOpacity]);
  const goSearch = () => { router.push({ pathname: '/search', params: { q: query } }); setQuery(''); };
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  const horizontalPadding = regular ? 36 : width < 360 ? 16 : 20;

  return <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
    {regular && <View style={styles.sidebar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
        <BrandLogo size={54} decorative /><View style={{ flex: 1 }}><T style={{ fontSize: 14, lineHeight: 20, fontFamily: f.medium }}>Everything</T><T style={{ fontSize: 22, lineHeight: 28, fontFamily: f.bold }}>Laurier</T></View>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingBottom: 24 }}>
        {primaryNavigation.map(item => <Pressable key={item.path} accessibilityRole="button" accessibilityState={{ selected: current === item.label }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.sideLink, current === item.label && styles.selected, pressed && styles.pressed]}>
          <Icon name={item.icon} size={21} color={current === item.label ? c.purple : c.muted} /><T style={[styles.sideText, current === item.label && { color: c.purple, fontFamily: f.bold }]}>{item.label === 'You' ? 'Your space' : item.label}</T>
        </Pressable>)}
        <T style={styles.groupLabel}>CAMPUS</T>
        {services.map(item => <Pressable key={item.path} accessibilityRole="button" accessibilityState={{ selected: pathname === item.path }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.sideLink, pathname === item.path && styles.selected, pressed && styles.pressed]}>
          <Icon name={item.icon} color={pathname === item.path ? c.purple : c.muted} /><T style={styles.sideText}>{item.label}</T>{item.path === '/saved' && saved.length > 0 && <T muted style={{ fontSize: 14 }}>{saved.length}</T>}
        </Pressable>)}
      </ScrollView>
      <T muted style={{ fontSize: 13, padding: 12 }}>Waterloo campus</T>
    </View>}
    <KeyboardAvoidingView style={{ flex: 1, minWidth: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <View style={[styles.topbar, { paddingHorizontal: horizontalPadding }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 8 }}>
          {!primary && <IconButton name="chevron-left" label="Back" onPress={goBack} />}
          {!regular && primary ? <Pressable accessibilityRole="button" accessibilityLabel="Everything Laurier home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.mobileBrand, pressed && styles.pressed]}><BrandLogo size={40} decorative /><T style={{ fontFamily: f.bold, fontSize: 17, lineHeight: 23, flexShrink: 1 }}>Everything Laurier</T></Pressable> : <T style={{ fontFamily: f.medium, fontSize: 17, lineHeight: 24, flexShrink: 1 }}>{title}</T>}
        </View>
        {pathname !== '/search' && (regular ? <Search value={query} onChange={setQuery} onSubmit={goSearch} placeholder="Search campus" style={{ width: width >= 1280 ? 300 : 240, backgroundColor: c.background }} /> : <IconButton name="search" label="Search campus" onPress={() => router.push('/search')} />)}
      </View>
      {pathname === '/map' ? <View style={{ flex: 1, minHeight: 0 }}>{children}</View> : <ScrollView key={pathname} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: regular ? 32 : 24, paddingBottom: 40, alignItems: 'center' }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <Animated.View style={{ width: '100%', maxWidth: 1120, gap: regular ? 32 : 28, opacity: contentOpacity }}>{children}</Animated.View>
      </ScrollView>}
      {!regular && <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1 }}>
          {primaryNavigation.map(item => {
            const active = current === item.label;
            return <Pressable key={item.path} accessibilityRole="tab" accessibilityLabel={item.label} aria-selected={active} accessibilityState={{ selected: active }} onPress={() => router.navigate(item.path)} style={({ pressed }) => [styles.bottomItem, { minWidth: Math.max(60, 58 * fontScale), flexDirection: height < 450 && width > 600 ? 'row' : 'column' }, pressed && styles.pressed]}>
              <View style={[styles.bottomIcon, active && styles.selected]}><Icon name={item.icon} size={22} color={active ? c.purple : c.muted} /></View><T style={{ color: active ? c.purple : c.muted, fontFamily: active ? f.bold : f.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{item.label}</T>
            </Pressable>;
          })}
        </ScrollView>
      </View>}
      {!!toast && <View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.toast, { bottom: regular ? 24 : 88 + insets.bottom }]}><Icon name="check-circle" color={c.gold} size={18} /><T style={{ color: c.surface, fontSize: 15, lineHeight: 22, flexShrink: 1 }}>{toast}</T></View>}
    </KeyboardAvoidingView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: c.background, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  pressed: { opacity: 0.7 },
  sidebar: { width: 244, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 16, backgroundColor: c.surface, borderRightWidth: 1, borderRightColor: c.border },
  brand: { flexDirection: 'row', alignItems: 'center', minHeight: 80, paddingHorizontal: 9, gap: 10, marginBottom: 24 },
  sideLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13 },
  selected: { backgroundColor: c.lavender },
  sideText: { flex: 1, color: c.muted, fontFamily: f.medium, fontSize: 16, lineHeight: 23 },
  groupLabel: { color: c.muted, fontSize: 12, lineHeight: 18, fontFamily: f.bold, letterSpacing: 0.8, paddingHorizontal: 14, marginTop: 26, marginBottom: 8 },
  topbar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 6, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  mobileBrand: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  bottomNav: { backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6 },
  bottomItem: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 3 },
  bottomIcon: { width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: c.purpleDark, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '90%' },
});
