import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ownerRequest } from '../lib/tutoring';
import { venueReviewLinks, VenueReviewPost } from '../lib/venue-review';
import { useLocal } from '../lib/state';
import { colors as c } from '../lib/theme';
import { Badge, Button, Card, Empty, ExternalButton, Pill, T } from './ui';
import { ReviewSheet } from './ReviewSheet';
export function VenueReviewQueue() {
  const [status, setStatus] = useState('pending'), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<VenueReviewPost[]>([]), [selected, setSelected] = useState<VenueReviewPost | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [checked, setChecked] = useState(false), [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const { externalMediaEnabled, setExternalMediaEnabled } = useLocal();
  useFocusEffect(useCallback(() => { setLoading(true); setRevision(v => v + 1); }, []));
  useEffect(() => { let active = true;
    void ownerRequest<VenueReviewPost[]>('posts', { status, offset: page * 50 }).then(data => { if (active) setRows(data); })
      .catch(problem => { if (active) { setRows([]); setError(problem.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, page, revision]);
  const refresh = () => { setLoading(true); setError(''); setRevision(v => v + 1); };
  const links = selected ? venueReviewLinks(selected) : null;
  async function review(decision: 'approved' | 'rejected') {
    if (!selected || busy || (decision === 'approved' && (!checked || !links?.postUrl))) return;
    setBusy(true); setError('');
    try { await ownerRequest('review_post', { id: selected.id, decision, expected_revision: selected.moderation_revision, expected_status: selected.moderation_status });
      setSelected(null); setSuccess(decision === 'approved' ? 'Post published' : 'Post rejected'); refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Review unavailable'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 20 }}>
    <T muted>New posts and edits stay private until you approve them. Check captions and every image or video for harassment, hate, sexual content, threats, private information and spam.</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['pending', 'approved', 'rejected'].map(value => <Pill key={value} label={value === 'pending' ? 'Awaiting review' : value.charAt(0).toUpperCase() + value.slice(1)} active={status === value} onPress={() => { if (status === value) return; setLoading(true); setError(''); setStatus(value); setPage(0); }} />)}</View>
    <Button secondary label="Refresh posts" icon="refresh-cw" loading={loading} onPress={refresh} />
    {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}{!!success && <T accessibilityLiveRegion="polite" style={{ color: c.green }}>{success}</T>}
    {loading ? <ActivityIndicator color={c.purple} /> : !rows.length ? <Card><Empty icon="check-circle" title="This queue is clear" description="Imported posts matching this status appear here." /></Card> : rows.map(post => <Card key={post.id} style={{ padding: 22, gap: 12 }}><Badge label={post.moderation_status === 'pending' ? 'Awaiting review' : post.moderation_status} /><T style={{ fontWeight: '600', fontSize: 20 }}>@{post.source_username}</T><T muted numberOfLines={3}>{post.caption || 'No caption'}</T><T muted>{new Date(post.posted_at).toLocaleDateString('en-CA')}</T><Button label="Review post" onPress={() => { setSelected(post); setChecked(false); setImageFailed(false); setError(''); }} /></Card>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}><Button secondary label="Previous page" disabled={loading || !page} onPress={() => { setLoading(true); setPage(v => v - 1); }} /><T muted>Page {page + 1}</T><Button secondary label="Next page" disabled={loading || rows.length < 50} onPress={() => { setLoading(true); setPage(v => v + 1); }} /></View>
    <ReviewSheet visible={!!selected} onClose={() => { if (!busy) setSelected(null); }}>
      <T accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600' }}>Review venue post</T>
      {selected && <><T style={{ fontWeight: '600' }}>@{selected.source_username}</T><T selectable>{selected.caption || 'No caption'}</T>
        {links?.imageUrl && externalMediaEnabled && !imageFailed ? <Image source={{ uri: links.imageUrl }} accessibilityLabel={`Review image from ${selected.source_username}`} onError={() => setImageFailed(true)} style={{ width: '100%', height: 320, backgroundColor: c.lavender }} resizeMode="contain" /> : null}
        {links?.imageUrl && !externalMediaEnabled && <><T muted>Loading the image contacts Meta and shares connection details.</T><Button secondary label="Allow Instagram review images" onPress={() => setExternalMediaEnabled(true)} /></>}
        {imageFailed && <T accessibilityRole="alert">Image unavailable. Inspect the original post before approving.</T>}
        {links?.postUrl ? <ExternalButton label="Inspect all media on Instagram" url={links.postUrl} /> : <T accessibilityRole="alert" style={{ color: c.error }}>Invalid source link. This post cannot be approved.</T>}
        <Pill label={checked ? 'Caption and all media checked' : 'I checked the caption and all original media against the community rules'} active={checked} onPress={() => setChecked(v => !v)} />
        {!!error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
        {selected.moderation_status !== 'approved' && <Button label="Approve and publish" loading={busy} disabled={!checked || !links?.postUrl} onPress={() => { void review('approved'); }} />}
        {selected.moderation_status !== 'rejected' && <Button secondary label="Reject post" loading={busy} onPress={() => { void review('rejected'); }} />}
      </>}
      <Button secondary label="Close review" disabled={busy} onPress={() => setSelected(null)} />
    </ReviewSheet>
  </View>;
}
