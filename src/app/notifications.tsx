import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { notificationVenues } from '../lib/notification-fields';
import { notificationRequest, NotificationPreferences } from '../lib/notifications';
import { pushSupported, pushToken } from '../lib/push-device';
import { AccountConsent } from '../components/AccountConsent';
import { NightlifeAgeBoundary } from '../components/NightlifeAgeGate';
import { Button, Card, PageHeading, T, body } from '../components/ui';
import { colors as c } from '../lib/theme';
export default function NotificationsScreen() {
  const { session } = useAuth();
  return <NightlifeAgeBoundary><PageHeading title="Notifications" subtitle="Just the venues you choose." />{!session ? <Card style={{ padding: 24, gap: 16 }}><T style={body}>Sign in to choose venue alerts. Notifications are optional.</T><Button label="Sign in" onPress={() => router.push('/login')} /></Card> : <AccountConsent><VenueChoices key={session.user.id} /></AccountConsent>}</NightlifeAgeBoundary>;
}
function VenueChoices() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [venues, setVenues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [denied, setDenied] = useState(false);
  async function load() {
    setError('');
    try { const next = await notificationRequest('preferences'); setPrefs(next); setVenues(next.venues); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
  }
  useEffect(() => { let active = true; void notificationRequest('preferences').then(next => { if (active) { setPrefs(next); setVenues(next.venues); } }).catch(() => { if (active) setError('Could not load your choices.'); }); return () => { active = false; }; }, []);
  async function save(enable: boolean) {
    setBusy(true); setError(''); setMessage(''); setDenied(false);
    try {
      if (enable) {
        const device = await pushToken(true);
        if (!device) { setDenied(true); throw Error('Notifications are not allowed on this device. You can change this in Settings.'); }
        await notificationRequest('save', { enabled: true, venues, age_confirmed: true });
        setPrefs(await notificationRequest('register', device));
        setMessage('Venue alerts are on for this device.');
      } else {
        setPrefs(await notificationRequest('save', { enabled: false, venues, age_confirmed: true }));
        setMessage('Choices saved. Venue alerts are off on all your devices.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 20 }}>
    <Card style={{ padding: 24, gap: 16 }}><T style={{ fontSize: 22, fontWeight: '600' }}>Venue posts</T><T style={body}>Get an alert when a selected venue’s new post reaches our feed. Updates are periodic and may take several hours.</T>
      {!prefs && !error && <ActivityIndicator color={c.purple} />}
      {notificationVenues.map(venue => <View key={venue.username} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56 }}><T style={{ flex: 1, fontSize: 17 }}>{venue.name}</T><Switch accessibilityLabel={`Notifications from ${venue.name}`} disabled={busy || !prefs} value={venues.includes(venue.username)} trackColor={{ true: c.purple }} onValueChange={value => setVenues(current => value ? [...current, venue.username] : current.filter(item => item !== venue.username))} /></View>)}
      <T muted style={{ fontSize: 14, lineHeight: 22 }}>Up to 6 alerts per device each day. No sound or badges. Your choices and a device notification token are saved to deliver alerts. Turning alerts off removes registered devices.</T>
      {prefs && <T accessibilityLiveRegion="polite">{prefs.enabled ? prefs.registered ? 'Alerts on for this device' : 'Venue alerts enabled · this device needs connecting' : 'Alerts off'}</T>}
      {prefs && !prefs.available && <T style={body}>Delivery is being set up. You can save your venue choices now.</T>}
      {!pushSupported && <T style={body}>{Platform.OS === 'web' ? 'Use the installed iPhone or Android app to receive alerts.' : 'Alerts need the installed app on a physical device.'}</T>}
      <Button label={prefs?.enabled ? 'Update alerts on this device' : 'Enable alerts on this device'} disabled={!prefs?.available || !pushSupported || !venues.length} loading={busy} onPress={() => { void save(true); }} />
      <Button secondary label={prefs?.enabled ? 'Turn off on all devices' : 'Save choices with alerts off'} disabled={!prefs} loading={busy} onPress={() => { void save(false); }} />
      {denied && Platform.OS !== 'web' && <Button secondary label="Open device settings" onPress={() => { void Linking.openSettings().catch(() => setError('Open Settings and choose Everything Laurier.')); }} />}
      {!!error && <><T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>{!prefs && <Button secondary label="Try again" onPress={() => { void load(); }} />}</>}
      {!!message && <T accessibilityLiveRegion="polite">{message}</T>}
    </Card><Button secondary label="Privacy & data choices" onPress={() => router.push('/data-controls')} />
  </View>;
}
