import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ownerRequest } from '../lib/tutoring';
import type { StudentProfile } from '../lib/student-profiles';
import { colors as c, fonts as f } from '../lib/theme';
import { Badge, Button, Card, Empty, Pill, T } from './ui';
import { ReviewSheet } from './ReviewSheet';

type ReviewProfile = Pick<StudentProfile, 'id' | 'display_name' | 'program' | 'year_label' | 'bio' | 'contact_email' | 'moderation_status'> & { moderation_revision: number };

export function ProfileReviewQueue() {
  const [status, setStatus] = useState('pending'), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<ReviewProfile[]>([]), [selected, setSelected] = useState<ReviewProfile | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [checked, setChecked] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  useFocusEffect(useCallback(() => { setLoading(true); setRevision(v => v + 1); }, []));
  useEffect(() => {
    let active = true;
    void ownerRequest<ReviewProfile[]>('profiles', { status, offset: page * 100 }).then(result => { if (active) setRows(result); })
      .catch(problem => { if (active) { setRows([]); setError(problem.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, page, revision]);
  const refresh = () => { setLoading(true); setError(''); setRevision(v => v + 1); };
  async function review(decision: 'approved' | 'rejected' | 'suspended') {
    if (!selected || busy || (decision === 'approved' && !checked)) return;
    setBusy(true); setError('');
    try {
      await ownerRequest('review_profile', { id: selected.id, decision, expected_revision: selected.moderation_revision });
      setSelected(null); setSuccess(decision === 'approved' ? 'Profile approved' : decision === 'suspended' ? 'Profile suspended' : 'Profile rejected'); refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Review unavailable'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 20 }}>
    <T muted>Check every field for harassment, hate, sexual content, threats, private information, spam and impersonation. Only approve profiles that follow the community rules.</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['pending', 'approved', 'rejected', 'suspended'].map(value => <Pill key={value} label={value === 'pending' ? 'Awaiting review' : value.charAt(0).toUpperCase() + value.slice(1)} active={status === value} onPress={() => { if (value === status) return; setLoading(true); setError(''); setStatus(value); setPage(0); }} />)}</View>
    <Button secondary label="Refresh profiles" icon="refresh-cw" loading={loading} onPress={refresh} />
    {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
    {!!success && <T accessibilityLiveRegion="polite" style={{ color: c.green }}>{success}</T>}
    {loading ? <ActivityIndicator color={c.purple} /> : rows.length === 0 ? <Card><Empty icon="check-circle" title="This queue is clear" description="Shared profiles matching this status appear here." /></Card> : rows.map(profile => <Card key={profile.id} style={{ padding: 22, gap: 12 }}>
      <Badge label={profile.moderation_status === 'pending' ? 'Awaiting review' : profile.moderation_status} />
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>{profile.display_name}</T>
      <T muted>{profile.program}</T>
      <Button label="Review profile" onPress={() => { setSelected(profile); setChecked(false); setError(''); }} />
    </Card>)}
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <Button secondary label="Previous page" disabled={loading || page === 0} onPress={() => { setLoading(true); setPage(v => v - 1); }} />
      <T muted>Page {page + 1}</T>
      <Button secondary label="Next page" disabled={loading || rows.length < 100} onPress={() => { setLoading(true); setPage(v => v + 1); }} />
    </View>
    <ReviewSheet visible={!!selected} onClose={() => { if (!busy) setSelected(null); }} maxWidth={640}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 24 }}>Review student profile</T>
      {selected && <>
        {[['Name', selected.display_name], ['Program', selected.program], ['Year', selected.year_label || 'Not supplied'], ['Introduction', selected.bio || 'Not supplied'], ['Verified contact email', selected.contact_email ?? 'Not available']].map(([label, value]) => <View key={label} style={{ gap: 6 }}><T style={{ fontFamily: f.bold }}>{label}</T><T selectable>{value}</T></View>)}
        <Pill label={checked ? 'Profile checked' : 'I checked every field against the community rules'} active={checked} onPress={() => setChecked(v => !v)} />
        {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
        {selected.moderation_status !== 'approved' && <Button label="Approve profile" loading={busy} disabled={!checked} onPress={() => { void review('approved'); }} />}
        {selected.moderation_status !== 'rejected' && <Button secondary label="Reject profile" loading={busy} onPress={() => { void review('rejected'); }} />}
        {selected.moderation_status !== 'suspended' && <Button secondary label="Suspend profile and prevent edits" loading={busy} onPress={() => { void review('suspended'); }} />}
      </>}
      <Button secondary label="Close review" disabled={busy} onPress={() => setSelected(null)} />
    </ReviewSheet>
  </View>;
}
