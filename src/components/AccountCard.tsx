import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors as c, fonts as f } from '../lib/theme';
import { Badge, Button, Card, Icon, T, body } from './ui';

export function AccountCard() {
  const { session, ready, busy, signOut } = useAuth();
  const [error, setError] = useState('');
  return <Card style={{ padding: 26, gap: 18 }}>
    {!ready ? <ActivityIndicator accessibilityLabel="Loading account" color={c.purple} /> : session ? <>
      <Badge label="SIGNED IN" color={c.sage} textColor={c.green} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ padding: 14, backgroundColor: c.lavender, borderRadius: 18 }}><Icon name="user" color={c.purple} size={25} /></View>
        <View style={{ flex: 1, gap: 6 }}><T style={{ fontFamily: f.serif, fontSize: 26 }}>Make yourself at home.</T><T selectable style={{ color: c.muted }}>{session.user.email}</T></View>
      </View>
      <T style={body}>You’re signed in to Everything Laurier. Your saved items currently stay on this device.</T>
      {!!error && <T accessibilityRole="alert" style={{ color: '#8E3434' }}>{error}</T>}
      <View style={{ alignItems: 'flex-start' }}><Button secondary label={busy ? 'Signing out…' : 'Sign out'} icon="log-out" disabled={busy} onPress={() => {
        setError('');
        void signOut().catch(problem => setError(problem instanceof Error ? problem.message : 'Please try again.'));
      }} /></View>
    </> : <>
      <Badge label="YOUR EVERYTHING LAURIER ACCOUNT" />
      <T style={{ fontFamily: f.serif, fontSize: 27 }}>A little more at home.</T>
      <T style={body}>Sign in or create your account with an email verification code. No password needed.</T>
      <View style={{ alignItems: 'flex-start' }}><Button label="Sign in with email" icon="mail" onPress={() => router.push('/login')} /></View>
      <T muted style={{ fontSize: 12, lineHeight: 20 }}>You can also keep exploring as a guest. Bookmarks stay on this device.</T>
    </>}
  </Card>;
}
