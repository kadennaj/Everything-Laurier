import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { getMyProfile, StudentProfile } from '../lib/student-profiles';
import { colors as c, fonts as f } from '../lib/theme';
import { Badge, Button, Card, T, body } from './ui';

export function StudentProfileCard() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getMyProfile(userId).then(value => { if (active) { setProfile(value); setError(''); } })
      .catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, retry]);

  if (!session) return null;
  return <Card style={{ padding: 21, gap: 15 }}>
    <Badge label="Student profile" />
    {loading ? <ActivityIndicator color={c.purple} /> : error ? <><T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>
      <View style={{ alignItems: 'flex-start' }}><Button secondary label="Try again" onPress={() => { setLoading(true); setRetry(value => value + 1); }} /></View></>
      : !profile ? <><T style={{ fontFamily: f.bold, fontSize: 24 }}>Tell campus about you.</T>
        <T style={body}>Add your name and program, then choose whether other students can find and email you.</T>
        <View style={{ alignItems: 'flex-start' }}><Button label="Complete your profile" icon="user-plus" onPress={() => router.push('/account-setup')} /></View></>
      : <>
        <T style={{ fontFamily: f.bold, fontSize: 25 }}>{profile.display_name}</T>
        <T muted>{profile.program}{profile.year_label ? ` · ${profile.year_label}` : ''}</T>
        {!!profile.bio && <T style={body}>{profile.bio}</T>}
        <Badge label={profile.is_discoverable ? (profile.moderation_status === 'approved' ? 'Visible to students' : profile.moderation_status === 'pending' ? 'Awaiting review' : 'Not published') : 'Private profile'}
          color={profile.is_discoverable ? c.sage : c.background} textColor={profile.is_discoverable ? c.green : c.muted} />
        {profile.is_discoverable && <T muted style={{ fontSize: 12, lineHeight: 20 }}>Once approved, your profile and verified email are visible to signed-in students. New or edited shared profiles are reviewed before publication.</T>}
        <View style={{ alignItems: 'flex-start' }}><Button secondary label="Edit your profile" icon="edit-2" onPress={() => router.push('/edit-profile')} /></View>
      </>}
  </Card>;
}
