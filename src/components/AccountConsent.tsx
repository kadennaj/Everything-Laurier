import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { privacyRequest, PrivacySummary, TERMS_VERSION } from '../lib/data-controls';
import { colors as c } from '../lib/theme';
import { Button, Card, Icon, T, body } from './ui';

export function AccountConsent({ children }: { children: React.ReactNode }) {
 const [state, setState] = useState<'loading' | 'needed' | 'accepted'>('loading');
 const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
 useEffect(() => { let active = true; void privacyRequest<PrivacySummary>('summary').then(data => { if (active) setState(data.consent?.terms_version === TERMS_VERSION ? 'accepted' : 'needed'); }).catch(() => { if (active) setState('needed'); }); return () => { active = false; }; }, []);
 async function accept() { setBusy(true); setError(''); try { await privacyRequest('accept'); setState('accepted'); } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); } finally { setBusy(false); } }
 if (state === 'loading') return <ActivityIndicator accessibilityLabel="Checking account choices" color={c.purple} />;
 if (state === 'accepted') return <>{children}</>;
 return <Card style={{ padding: 22, gap: 16 }}><T accessibilityRole="header" style={{ fontSize: 22 }}>Before you share</T><T style={body}>Account features are for people aged 16 or older. Read the terms and privacy notice before sharing a profile, submitting line estimates or applying to tutor. Public campus browsing remains available without an account.</T><View style={{ gap: 8 }}><Button secondary label="Read terms of service" onPress={() => router.push('/terms')} /><Button secondary label="Read privacy policy" onPress={() => router.push('/privacy')} /></View>
  <Pressable accessibilityRole="checkbox" accessibilityLabel="I am at least 16 and agree to the terms of service" accessibilityState={{ checked, disabled: busy }} disabled={busy} onPress={() => setChecked(value => !value)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: c.muted, borderRadius: 12 }}><Icon name={checked ? 'check-square' : 'square'} color={c.purple} /><T style={{ flex: 1, lineHeight: 25 }}>I am at least 16 and agree to the terms of service.</T></Pressable>
  <T muted style={{ fontSize: 14, lineHeight: 22 }}>This records the terms version and age confirmation, not your birth date. Profile sharing, transcripts, location and external images have separate choices.</T>
  {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}<Button label="Agree and continue" disabled={!checked} loading={busy} onPress={() => { void accept(); }} /><Button secondary label="Keep browsing campus" onPress={() => router.replace('/')} />
 </Card>;
}
