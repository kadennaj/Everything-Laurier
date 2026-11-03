import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { colors as c } from '../lib/theme';
import { BrandLogo } from './BrandLogo';
import { Button, Icon, T } from './ui';

const KEY = 'everything-laurier:welcome:v1';

export function Welcome() {
  const { session, ready } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width / fontScale < 600;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then(value => { if (active) setSeen(value === 'done'); })
      .catch(() => { if (active) setSeen(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready || !session) return;
    void AsyncStorage.setItem(KEY, 'done').then(() => setSeen(true)).catch(() => {});
  }, [ready, session]);
  async function finish(signIn: boolean) {
    if (busy) return;
    setBusy(true); setError('');
    try { await AsyncStorage.setItem(KEY, 'done'); setSeen(true); if (signIn) router.push('/login'); }
    catch { setError('Your choice could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Modal visible={ready && !session && seen !== true} animationType="fade" onRequestClose={() => { void finish(false); }} supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}>
    <ScrollView pinchGestureEnabled={false} style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingTop: Math.max(insets.top + 24, 40), paddingBottom: Math.max(insets.bottom + 24, 40) }}>
      {seen === null ? <ActivityIndicator color={c.purple} /> : <View style={{ width: '100%', maxWidth: 680, alignItems: 'center', gap: compact ? 24 : 32 }}>
        <BrandLogo size={compact ? 88 : 108} />
        <View style={{ gap: 16, alignItems: 'center' }}>
          <T style={{ fontSize: 17, fontWeight: '600', color: c.purple }}>Everything Laurier</T>
          <T accessibilityRole="header" style={{ fontSize: compact ? 45 : 68, lineHeight: compact ? 49 : 73, letterSpacing: -2, fontWeight: '700', textAlign: 'center' }}>Your campus.{ '\n' }All together.</T>
          <T muted style={{ fontSize: 19, lineHeight: 28, textAlign: 'center', maxWidth: 450 }}>Find your room, your people and your next plan.</T>
        </View>
        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 12, width: '100%', marginVertical: 8 }}>
          {([{ icon: 'map', label: 'Campus & indoor maps' }, { icon: 'users', label: 'Clubs & community' }, { icon: 'moon', label: 'Nights around Waterloo' }] as const).map(item => <View key={item.icon} style={{ flex: compact ? undefined : 1, flexDirection: compact ? 'row' : 'column', alignItems: 'center', gap: 12, padding: compact ? 16 : 22, backgroundColor: c.surface, borderRadius: 22 }}><Icon name={item.icon} color={c.purple} size={24} /><T style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', flexShrink: 1 }}>{item.label}</T></View>)}
        </View>
        <View style={{ width: '100%', maxWidth: 400, gap: 12 }}>
          <Button label="Sign in or create an account" onPress={() => { void finish(true); }} loading={busy} />
          <Button secondary label="Explore as a guest" onPress={() => { void finish(false); }} disabled={busy} />
        </View>
        {!!error && <T accessibilityRole="alert" style={{ color: c.error, textAlign: 'center' }}>{error}</T>}
        <T muted style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>An independent guide to Laurier Waterloo</T>
      </View>}
    </ScrollView>
  </Modal>;
}
