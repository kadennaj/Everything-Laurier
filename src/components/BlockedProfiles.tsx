import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { changeProfileBlock, getProfileBlocks, ProfileBlock } from '../lib/moderation';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Card, T, body } from './ui';
export function BlockedProfiles() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    getProfileBlocks().then(data => { if (active) { setBlocks(data); setError(''); } })
      .catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, retry]);
  if (!session) return null;
  return <Card style={{ padding: 22, gap: 15 }}>
    <T style={{ fontFamily: f.bold, fontSize: 19 }}>Blocked profiles</T>
    <T style={body}>Blocking hides a profile from you and hides your discoverable profile from that student. It cannot recall an email already shared or block contact outside the app.</T>
    {loading ? <ActivityIndicator color={c.purple} /> : blocks.map(block => <View key={block.target_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <T style={{ flex: 1 }}>{block.display_name}</T><Button secondary label="Unblock" disabled={!!busy} loading={busy === block.target_id} onPress={() => {
        setBusy(block.target_id); setError('');
        void changeProfileBlock(block.target_id, false).then(() => setBlocks(current => current.filter(item => item.target_id !== block.target_id)))
          .catch(problem => setError(problem instanceof Error ? problem.message : 'Please try again.')).finally(() => setBusy(''));
      }} />
    </View>)}
    {!loading && !error && !blocks.length && <T muted>No blocked profiles.</T>}
    {!!error && <><T accessibilityRole="alert" style={{ color: c.error }}>{error}</T><Button secondary label="Try again" onPress={() => { setLoading(true); setRetry(value => value + 1); }} /></>}
  </Card>;
}
