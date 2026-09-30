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
  return <Card style={{ padding: 26, gap: 17 }}>
    <Badge label="YOUR STUDENT PROFILE" />
    {loading ? <ActivityIndicator color={c.purple} /> : error ? <><T accessibilityRole="alert" style={{ color: '#8E3434' }}>{error}</T>
      <View style={{ alignItems: 'flex-start' }}><Button secondary label="Try again" onPress={() => { setLoading(true); setRetry(value => value + 1); }} /></View></>
      : !profile ? <><T style={{ fontFamily: f.serif, fontSize: 27 }}>Tell campus about you.</T>
        <T style={body}>Add your name and program, then choose whether other students can find and email you.</T>
        <View style={{ alignItems: 'flex-start' }}><Button label="Complete your profile" icon="user-plus" onPress={() => router.push('/account-setup')} /></View></>
      : <>
        <T style={{ fontFamily: f.serif, fontSize: 28 }}>{profile.display_name}</T>
        <T muted>{profile.program}{profile.year_label ? ` · ${profile.year_label}` : ''}</T>
        {!!profile.bio && <T style={body}>{profile.bio}</T>}
        <Badge label={profile.is_discoverable ? 'VISIBLE TO SIGNED-IN STUDENTS' : 'PRIVATE PROFILE'}
          color={profile.is_discoverable ? c.sage : c.background} textColor={profile.is_discoverable ? c.green : c.muted} />
        {profile.is_discoverable && <T muted style={{ fontSize: 12, lineHeight: 20 }}>Your verified email is shown on your student profile so others can contact you.</T>}
        <View style={{ alignItems: 'flex-start' }}><Button secondary label="Edit your profile" icon="edit-2" onPress={() => router.push('/edit-profile')} /></View>
      </>}
  </Card>;
}
