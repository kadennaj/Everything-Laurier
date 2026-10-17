import React, { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Platform, Share } from 'react-native';
import { useAuth } from '../lib/auth';
import { useLocal } from '../lib/state';
import { privacyRequest, PrivacySummary, TERMS_VERSION } from '../lib/data-controls';
import { buildDataExport } from '../lib/data-export';
import { Button, Card, ExternalButton, NavigationRow, PageHeading, T, body } from '../components/ui';
import { DeleteAccountCard } from '../components/DeleteAccountCard';
import { AccountConsent } from '../components/AccountConsent';
import { colors as c, fonts as f } from '../lib/theme';

export default function DataControls() {
 const { session } = useAuth(), local = useLocal();
 const [summary, setSummary] = useState<PrivacySummary | null>(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [exportText, setExportText] = useState('');
 const refresh = useCallback(async () => { if (!session) { setSummary(null); setExportText(''); return; } setLoading(true); setError(''); try { setSummary(await privacyRequest<PrivacySummary>('summary')); } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); } finally { setLoading(false); } }, [session]);
 useFocusEffect(useCallback(() => { void refresh(); return () => setExportText(''); }, [refresh]));
 async function exportData() {
  setBusy(true); setError('');
  try {
   const server = session ? await privacyRequest<Record<string, unknown>>('export') : {};
   const value = buildDataExport(server, { saved: local.saved, hiddenSources: local.hiddenSources, hiddenPosts: local.hiddenPosts, nightlifeAgeConfirmed: local.nightlifeAgeConfirmed, externalMediaEnabled: local.externalMediaEnabled });
   setExportText(value);
   if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([value], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'everything-laurier-my-data.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
   }
  } catch (problem) { setError(problem instanceof Error ? problem.message : 'Your data could not be exported.'); } finally { setBusy(false); }
 }
 async function hideProfile() { setBusy(true); setError(''); try { setSummary(await privacyRequest<PrivacySummary>('hide_profile')); local.notify('Your profile is now private.'); } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); } finally { setBusy(false); } }
 return <><PageHeading title="Your data & choices" subtitle="See what is stored, change what you share and request help." />
  {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
  <Card style={{ padding: 22, gap: 16 }}><T accessibilityRole="header" style={heading}>On this device</T><T style={body}>{local.saved.length} saved items · {local.hiddenSources.length} hidden venues · {local.hiddenPosts.length} hidden posts. These preferences stay on this device. GPS coordinates are processed in memory, without a stored location history.</T><T style={body}>Instagram images: {local.externalMediaEnabled ? 'allowed' : 'off'}. Loading external images sends your IP address and connection details to Meta. Captions can be read with images off.</T><Button secondary disabled={!local.ready} label={local.externalMediaEnabled ? 'Turn Instagram images off' : 'Allow Instagram images'} onPress={() => local.setExternalMediaEnabled(!local.externalMediaEnabled)} /><T style={body}>Nightlife age confirmation: {local.nightlifeAgeConfirmed ? '19 or older confirmed' : 'not confirmed'}. We do not store your birth date.</T>{local.nightlifeAgeConfirmed && <Button secondary label="Reset nightlife age choice" onPress={local.resetNightlifeAge} />}<Button secondary label="Manage hidden feeds" onPress={() => router.push('/community')} /></Card>
  <Card style={{ padding: 22, gap: 16 }}><T accessibilityRole="header" style={heading}>In your account</T>{!session ? <><T style={body}>You are browsing as a guest. Sign in to see your account records. Device choices above still work.</T><Button label="Sign in" onPress={() => router.push('/login')} /></> : <><T selectable>{session.user.email}</T>{loading ? <ActivityIndicator color={c.purple} /> : summary ? <><T style={body}>{summary.profile ? `Profile: ${summary.profile.name} · ${summary.profile.program}. ${summary.profile.discoverable ? 'Visible to signed-in students.' : 'Private.'}` : 'No student profile saved.'}</T><T style={body}>{summary.applications} tutor applications · {summary.reports} content reports · {summary.blocks} blocked profiles.</T><T style={body}>{summary.consent ? `Terms version ${summary.consent.terms_version} accepted ${new Date(summary.consent.accepted_at).toLocaleDateString()}. Age 16 or older confirmed; no birth date collected.` : 'Terms and minimum-age confirmation have not been recorded.'}</T>{summary.profile?.discoverable && <Button secondary label="Make my profile private" loading={busy} onPress={() => { void hideProfile(); }} />}</> : null}<Button secondary label="Refresh account summary" loading={loading} onPress={() => { void refresh(); }} /><Button secondary label="Edit my profile" onPress={() => router.push('/edit-profile')} /><Button secondary label="Manage or withdraw tutor applications" onPress={() => router.push('/help?section=tutoring')} /></>}</Card>
  {session && !loading && summary && summary.consent?.terms_version !== TERMS_VERSION && <AccountConsent><T style={body}>Account terms recorded. Refresh the summary to see the updated record.</T></AccountConsent>}
  <Card style={{ padding: 22, gap: 16 }}><T accessibilityRole="header" style={heading}>Get a copy or request a correction</T><T style={body}>The export includes your current account records and device choices. It excludes passwords and session tokens. Transcript files, provider logs and support emails need a separate access request. Your reports include up to the latest 1,000 records; request any remaining records from support.</T><T style={body}>The file contains private information. Save it somewhere you trust. Exports are limited to 3 per hour.</T><Button label={Platform.OS === 'web' ? 'Download my data' : 'Prepare my data copy'} loading={busy} disabled={loading || (!!session && !summary) || !local.ready} onPress={() => { void exportData(); }} />{!!exportText && <><T accessibilityLiveRegion="polite">Your data copy is ready. Leave this page to clear this preview.</T>{Platform.OS !== 'web' && <Button secondary label="Choose where to share my data" onPress={() => { void Share.share({ message: exportText }).catch(() => setError('The share sheet could not open. Your copy is available below.')); }} />}<T selectable style={{ fontSize: 14, lineHeight: 22 }}>{exportText}</T></>}<ExternalButton label="Request access or correction by email" url="mailto:everythinglaurier@gmail.com?subject=Personal%20data%20access%20or%20correction" /></Card>
  <DeleteAccountCard />
  <Card style={{ padding: 22, gap: 14 }}><T accessibilityRole="header" style={heading}>Need deletion help?</T><T style={body}>If you cannot sign in, email Kaden Najarali at everythinglaurier@gmail.com. Ask for account or personal-data deletion. Do not include your password, verification code or unredacted transcript. We verify account ownership before acting. Limited provider logs and backups follow their retention schedules.</T><ExternalButton label="Request personal-data deletion" url="mailto:everythinglaurier@gmail.com?subject=Personal%20data%20deletion%20request" /></Card>
  <Card><NavigationRow title="Privacy policy" icon="shield" onPress={() => router.push('/privacy')} /><NavigationRow title="Cookies & storage" icon="hard-drive" last onPress={() => router.push('/cookies')} /></Card>
 </>;
}
const heading = { fontFamily: f.bold, fontSize: 21, lineHeight: 28 };
