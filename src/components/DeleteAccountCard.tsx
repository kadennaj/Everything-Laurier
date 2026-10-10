import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Card, T, body } from './ui';

export function DeleteAccountCard() {
  const { session, busy, deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  if (!session) return null;
  const cancel = () => { if (!deleting) setConfirming(false); };
  const remove = async () => {
    setDeleting(true);
    setError('');
    try { await deleteAccount(); setConfirming(false); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); }
    finally { setDeleting(false); }
  };
  return <>
    <Card style={{ padding: 20, gap: 13 }}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 18 }}>Delete your account</T>
      <T style={body}>Permanently remove your account, student profile, and line reports.</T>
      <View style={{ alignItems: 'flex-start' }}><Button secondary label="Delete account" icon="trash-2" disabled={busy} onPress={() => { setError(''); setConfirming(true); }} /></View>
    </Card>
    <Modal visible={confirming} transparent animationType="fade" onRequestClose={cancel}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(24,20,31,0.55)' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 460, maxHeight: '90%', alignSelf: 'center', borderRadius: 22, backgroundColor: c.surface, overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
            <T muted style={{ fontFamily: f.medium, fontSize: 12 }}>Everything Laurier</T>
            <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 25 }}>Permanently delete your account?</T>
            <T style={body}>Deletion is permanent and irreversible. Once confirmed, your account, profile, and line reports are immediately removed from the live app. You will be signed out on all devices. Saved items on this device will also be cleared.</T>
            <T muted style={{ fontSize: 12, lineHeight: 20 }}>Limited provider security logs and backups follow the retention terms in the privacy policy. Copies already received by other students cannot be recalled.</T>
            {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
            <Button label={deleting ? 'Deleting your account…' : 'Permanently delete account'} icon="trash-2" style={{ backgroundColor: c.error }} disabled={busy} loading={deleting} onPress={() => { void remove(); }} />
            <Button secondary label="Keep my account" disabled={deleting} onPress={cancel} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
