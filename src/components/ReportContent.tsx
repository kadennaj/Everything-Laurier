import React, { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { reportContent, reportReasons, ReportReason } from '../lib/moderation';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Card, Icon, Pill, T, body } from './ui';

type PostActions = { venueName: string; hidePost: () => void; hideVenue: () => void; disabled: boolean };
export function ReportContent({ kind, target, postActions }: { kind: 'profile' | 'post'; target: string; postActions?: PostActions }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  function openReport() { setReason(null); setSuccess(false); setMessage(''); setShowMenu(false); setOpen(true); }
  function close() { if (!busy) setOpen(false); }
  async function submit() {
    if (!reason || busy) return;
    setBusy(true); setMessage('');
    try { await reportContent(kind, target, reason); setSuccess(true); setMessage('Your report is saved for review. Thank you for letting us know.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Your report could not be saved.'); }
    finally { setBusy(false); }
  }
  return <>
    {postActions ? <Pressable accessibilityRole="button" accessibilityLabel={`Post options for ${postActions.venueName}`} accessibilityState={{ expanded: open }}
      onPress={() => { setShowMenu(true); setOpen(true); }} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.pressed : 'transparent' })}>
      <Icon name="more-horizontal" size={21} color={c.muted} />
    </Pressable> : <Button secondary label={`Report ${kind}`} icon="flag" onPress={openReport} />}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, padding: 24, backgroundColor: 'rgba(24,19,31,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <Pressable accessible={false} onPress={close} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <Card accessibilityViewIsModal style={{ width: '100%', maxWidth: showMenu ? 360 : 520, maxHeight: '90%', padding: 24 }}>
          {showMenu && postActions ? <ScrollView contentContainerStyle={{ gap: 12 }}>
            <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>Post options</T>
            <T muted style={{ fontSize: 13, marginBottom: 4 }}>{postActions.venueName}</T>
            <Button secondary label="Hide post" icon="eye-off" disabled={postActions.disabled} onPress={() => { close(); postActions.hidePost(); }} />
            <Button secondary label="Hide venue" icon="slash" disabled={postActions.disabled} onPress={() => { close(); postActions.hideVenue(); }} />
            <Button secondary label="Report post" icon="flag" onPress={openReport} />
            <Button secondary label="Cancel" onPress={close} />
          </ScrollView> :
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
          </ScrollView>}
        </Card>
      </View>
    </Modal>
  </>;
}
