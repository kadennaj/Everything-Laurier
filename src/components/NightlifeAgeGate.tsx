import React, { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useLocal } from '../lib/state';
import { colors as c } from '../lib/theme';
import { Button, Card, T, body } from './ui';
export function NightlifeAgeGate() {
  const { confirmNightlifeAge, ready } = useLocal();
  const [declined, setDeclined] = useState(false);
  return <Card style={{ padding: 24, gap: 16 }}>
    <T accessibilityRole="header" style={{ fontWeight: '600', fontSize: 24 }}>Nightlife · 19+</T>
    <T style={body}>Venue posts and nightlife plans are intended for people 19 or older. Confirm your age to view this section. Follow Ontario alcohol laws and each venue’s admission rules.</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Button label="I am 19 or older" disabled={!ready} onPress={confirmNightlifeAge} /><Button secondary label="I am under 19" onPress={() => setDeclined(true)} /></View>
    {declined && <><T accessibilityRole="alert" style={{ color: c.purple }}>You can still explore campus clubs, places and academic support.</T><Button secondary label="Explore clubs" onPress={() => router.replace('/clubs')} /></>}
    <T muted style={{ fontSize: 12, lineHeight: 20 }}>Browsing age choices stay on this device. If you enable venue alerts, your account also records a 19-or-older confirmation. Your birth date is not collected.</T>
  </Card>;
}

export function NightlifeAgeBoundary({ children }: { children: React.ReactNode }) {
  const { nightlifeAgeConfirmed } = useLocal();
  return nightlifeAgeConfirmed ? <>{children}</> : <NightlifeAgeGate />;
}
