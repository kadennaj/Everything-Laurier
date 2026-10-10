import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { Badge, Button, Card, Empty, Eyebrow, T, body, s } from '../../components/ui';
import { ReportContent } from '../../components/ReportContent';
import { changeProfileBlock } from '../../lib/moderation';
import { useAuth } from '../../lib/auth';
import { DirectoryProfile, getDiscoverableProfile } from '../../lib/student-profiles';
import { colors as c, fonts as f } from '../../lib/theme';

export default function StudentPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, ready } = useAuth();
  const userId = session?.user.id;
  const [student, setStudent] = useState<DirectoryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    if (!userId || !id) return;
    let active = true;
    getDiscoverableProfile(id).then(profile => { if (active) setStudent(profile); })
      .catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, userId]);

  if (!ready) return <ActivityIndicator color={c.purple} />;
  if (!session) return <Empty title="Sign in to view student profiles." description="You need a verified email to contact students."
    icon="lock" action={<Button label="Sign in" onPress={() => router.push('/login')} />} />;
  if (loading) return <ActivityIndicator color={c.purple} />;
  if (error) return <Empty title="Profile unavailable." description={error} action={<Button secondary label="Back to People" onPress={() => router.replace('/people')} />} />;
  if (!student) return <Empty title="Profile not found." description="This student may have made their profile private."
    action={<Button secondary label="Back to People" onPress={() => router.replace('/people')} />} />;

  return <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', gap: 20 }}>
    <View style={{ alignItems: 'flex-start' }}><Button secondary label="Back to People" icon="arrow-left" onPress={() => router.replace('/people')} /></View>
    <Card style={{ padding: 30, gap: 23 }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View style={{ width: 82, height: 82, borderRadius: 27, backgroundColor: c.peach, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: f.bold, fontSize: 32, color: c.purple }}>{student.display_name.slice(0, 1).toUpperCase()}</T>
        </View>
        <Badge label="STUDENT PROFILE" />
      </View>
      <View style={{ gap: 9 }}><T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 32, lineHeight: 42 }}>{student.display_name}</T>
        <T muted>{student.program}{student.year_label ? ` · ${student.year_label}` : ''}</T></View>
      {!!student.bio && <><Eyebrow>A LITTLE ABOUT ME</Eyebrow><T style={body}>{student.bio}</T></>}
      {!!student.contact_email?.trim() && <View style={{ padding: 19, backgroundColor: c.lavender, borderRadius: 16, gap: 12 }}>
        <T style={{ fontFamily: f.bold }}>Reach out</T>
        <T muted style={{ lineHeight: 21 }}>This student chose to share their verified email with signed-in students.</T>
        {!!student.contact_email && <Button label="Send an email" icon="mail" onPress={() => {
          void Linking.openURL(`mailto:${student.contact_email}`).catch(() => setContactError('Your email app could not open.'));
        }} />}
        {!!student.contact_email && <T selectable style={{ color: c.purple }}>{student.contact_email}</T>}
        {!!contactError && <T accessibilityRole="alert" style={{ color: c.error }}>{contactError}</T>}
      </View>}
    </Card>
    <Card style={{ padding: 22, gap: 14 }}>
      <T style={body}>Keep connections comfortable. You can report this profile or hide it with a block.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><ReportContent kind="profile" target={student.id} /><Button secondary label="Block profile" icon="slash" onPress={() => setBlockConfirm(true)} /></View>
      {blockConfirm && <><T style={body}>Block this profile? You will no longer see each other’s directory profiles. This cannot block email outside the app.</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Button label="Confirm block" loading={blocking} disabled={blocking} onPress={() => {
          setBlocking(true); setBlockError('');
          void changeProfileBlock(student.id, true).then(() => router.replace('/people'))
            .catch(problem => setBlockError(problem instanceof Error ? problem.message : 'Please try again.')).finally(() => setBlocking(false));
        }} /><Button secondary label="Cancel" disabled={blocking} onPress={() => setBlockConfirm(false)} />
      </View></>}
      {!!blockError && <T accessibilityRole="alert" style={{ color: c.error }}>{blockError}</T>}
    </Card>
  </View>;
}
