import React, { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Modal, ScrollView, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { reportContent, reportReasons, ReportReason } from '../lib/moderation';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Card, Pill, T, body } from './ui';

export function ReportContent({ kind, target }: { kind: 'profile' | 'post'; target: string }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  async function submit() {
    if (!reason || busy) return;
    setBusy(true); setMessage('');
    try { await reportContent(kind, target, reason); setSuccess(true); setMessage('Your report is saved for review. Thank you for letting us know.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Your report could not be saved.'); }
    finally { setBusy(false); }
  }
  return <>
    <Button secondary label={`Report ${kind}`} icon="flag" onPress={() => { setReason(null); setSuccess(false); setMessage(''); setOpen(true); }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <View style={{ flex: 1, padding: 24, backgroundColor: 'rgba(24,19,31,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: '100%', maxWidth: 520, maxHeight: '90%', padding: 24 }}>
          <ScrollView contentContainerStyle={{ gap: 18 }}>
            <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 25 }}>Report this {kind}</T>
            <T style={body}>Choose the concern. Reports go to Everything Laurier for review. For immediate danger, contact emergency services.</T>
            {session ? <>
              {!success && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{reportReasons.map(item => <Pill key={item.id} label={item.label} active={reason === item.id} onPress={() => { if (!busy) setReason(item.id); }} />)}</View>}
              {!!message && <T accessibilityRole="alert" style={{ color: success ? c.green : c.error, lineHeight: 22 }}>{message}</T>}
              {!success && <Button label="Submit report" loading={busy} disabled={!reason || busy} onPress={() => { void submit(); }} />}
            </> : <><T style={body}>Sign in to save a report, or email support with the post link or profile details.</T><Button label="Sign in" onPress={() => { setOpen(false); router.push('/login'); }} /></>}
            <Button secondary label="Email support" icon="mail" disabled={busy} onPress={() => { void Linking.openURL('mailto:everythinglaurier@gmail.com').catch(() => setMessage('Open your email app and write to everythinglaurier@gmail.com.')); }} />
            <Button secondary label={success ? 'Done' : 'Cancel'} disabled={busy} onPress={() => setOpen(false)} />
          </ScrollView>
        </Card>
      </View>
    </Modal>
  </>;
}
