import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors as c, fonts as f } from '../lib/theme';
import { Badge, Button, Card, Icon, T, body } from './ui';

export function AccountCard() {
  const { session, ready, busy, signOut } = useAuth();
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  return <Card style={{ padding: 21, gap: 15 }}>
    {!ready ? <ActivityIndicator accessibilityLabel="Loading account" color={c.purple} /> : session ? <>
      <Badge label="Signed in" color={c.sage} textColor={c.green} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ padding: 14, backgroundColor: c.lavender, borderRadius: 18 }}><Icon name="user" color={c.purple} size={25} /></View>
        <View style={{ flex: 1, gap: 6 }}><T style={{ fontFamily: f.bold, fontSize: 23 }}>Make yourself at home.</T><T selectable style={{ color: c.muted }}>{session.user.email}</T></View>
      </View>
      <T style={body}>You’re signed in to Everything Laurier. Your saved items currently stay on this device.</T>
      {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
      <View style={{ alignItems: 'flex-start' }}><Button secondary label={signingOut ? 'Signing out…' : 'Sign out'} icon="log-out" disabled={busy} loading={signingOut} onPress={() => {
        setError('');
        setSigningOut(true);
        void signOut().catch(problem => setError(problem instanceof Error ? problem.message : 'Please try again.')).finally(() => setSigningOut(false));
      }} /></View>
    </> : <>
      <Badge label="Your account" />
      <T style={{ fontFamily: f.bold, fontSize: 24 }}>A little more at home.</T>
      <T style={body}>Sign in or create your account with an email verification code. No password needed.</T>
      <View style={{ alignItems: 'flex-start' }}><Button label="Sign in with email" icon="mail" onPress={() => router.push('/login')} /></View>
      <T muted style={{ fontSize: 12, lineHeight: 20 }}>You can also keep exploring as a guest. Bookmarks stay on this device.</T>
    </>}
  </Card>;
}
