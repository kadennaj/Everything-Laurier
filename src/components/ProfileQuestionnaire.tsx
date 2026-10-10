import { Redirect, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import type { ProfileAnswers } from '../lib/profile-fields';
import { getMyProfile, saveMyProfile } from '../lib/student-profiles';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Card, Icon, PageHeading, Pill, T } from './ui';

const YEAR_OPTIONS = ['Prefer not to say', '1st year', '2nd year', '3rd year', '4th year or later', 'Graduate'];
const EMPTY_ANSWERS: ProfileAnswers = { displayName: '', program: '', yearLabel: '', bio: '', discoverable: false };

export function ProfileQuestionnaire({ editing = false }: { editing?: boolean }) {
  const { session, ready: authReady } = useAuth();
  const userId = session?.user.id;
  const [answers, setAnswers] = useState<ProfileAnswers>(EMPTY_ANSWERS);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getMyProfile(userId).then(profile => {
      if (!active) return;
      if (profile && !editing) { router.replace('/profile'); return; }
      if (profile) setAnswers({
        displayName: profile.display_name, program: profile.program, yearLabel: profile.year_label,
        bio: profile.bio, discoverable: profile.is_discoverable,
      });
      setLoadError('');
      setLoaded(true);
    }).catch(problem => {
      if (active) { setLoadError(problem instanceof Error ? problem.message : 'Please try again.'); setLoaded(true); }
    });
    return () => { active = false; };
  }, [userId, editing, reload]);

  async function save() {
    if (!session || saving) return;
    setError(''); setSaving(true);
    try {
      await saveMyProfile(session.user, answers);
      router.replace('/profile');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Please try again.');
    } finally { setSaving(false); }
  }

  if (!authReady) return <ActivityIndicator color={c.purple} />;
  if (!session) return <Redirect href="/login" />;
  if (!loaded) return <View style={styles.loading}><ActivityIndicator color={c.purple} /><T muted>Getting your profile ready…</T></View>;
  if (loadError) return <Card style={styles.card}><T accessibilityRole="alert" style={{ color: '#8E3434' }}>{loadError}</T>
    <Button secondary label="Try again" onPress={() => { setLoaded(false); setReload(value => value + 1); }} /></Card>;

  return <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center', gap: 24 }}>
    <PageHeading eyebrow={editing ? 'YOUR STUDENT PROFILE' : 'ONE LAST STEP'} title={editing ? 'Make it yours.' : 'Tell campus about you.'}
      subtitle={editing ? 'Update what other students can find about you.' : 'Answer a few questions so students in your program can find you. Your profile stays private until you choose to share it.'} />
    <Card style={styles.card}>
      <Field label="Your name" helper="What should students call you?" value={answers.displayName} maxLength={80}
        onChange={displayName => setAnswers(value => ({ ...value, displayName }))} placeholder="Your name" />
      <Field label="Program" helper="Students will search by program. Use its usual name, such as Computer Science or BBA." value={answers.program} maxLength={120}
        onChange={program => setAnswers(value => ({ ...value, program }))} placeholder="Your program" />
      <View style={{ gap: 10 }}>
        <T style={styles.label}>Year of study <T muted>(optional)</T></T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {YEAR_OPTIONS.map(year => <Pill key={year} label={year} active={answers.yearLabel === year}
            onPress={() => setAnswers(value => ({ ...value, yearLabel: year }))} />)}
        </View>
      </View>
      <Field label="A little about you" helper="Optional. Share what you study, enjoy, or hope to connect over." value={answers.bio}
        onChange={bio => setAnswers(value => ({ ...value, bio }))} placeholder="I’d love to meet people who…" maxLength={500} multiline />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: answers.discoverable }}
        accessibilityLabel="Let other signed-in students find and email me"
        onPress={() => setAnswers(value => ({ ...value, discoverable: !value.discoverable }))}
        style={({ pressed }) => [styles.discover, answers.discoverable && { borderColor: c.purple, backgroundColor: c.lavender }, pressed && { opacity: 0.75 }]}>
        <View style={[styles.checkbox, answers.discoverable && { backgroundColor: c.purple, borderColor: c.purple }]}>
          {answers.discoverable && <Icon name="check" size={16} color={c.surface} />}
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <T style={{ fontFamily: f.bold }}>Let students find and contact me</T>
          <T muted style={{ lineHeight: 20, fontSize: 12 }}>Signed-in students can see your name, program, year, introduction, and verified email ({session.user.email}). Shared profiles are reviewed before publication. Leave this off to keep your profile private.</T>
        </View>
      </Pressable>
      <T muted style={{ fontSize: 12, lineHeight: 20 }}>By saving, you agree to follow the community rules. Only share your own information.</T>
      <Button secondary label="Read community rules" onPress={() => router.push('/community')} />
      {!!error && <T accessibilityRole="alert" style={{ color: '#8E3434', lineHeight: 22 }}>{error}</T>}
      <Button label={saving ? 'Saving your profile…' : editing ? 'Save profile' : 'Finish and save profile'} icon="check" disabled={saving} loading={saving} onPress={() => { void save(); }} />
    </Card>
  </View>;
}

function Field({ label, helper, value, onChange, placeholder, maxLength, multiline = false }: {
  label: string; helper: string; value: string; onChange: (value: string) => void; placeholder: string;
  maxLength: number; multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}>
    <T style={styles.label}>{label}</T>
    <T muted style={{ fontSize: 12, lineHeight: 19 }}>{helper}</T>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholderTextColor={c.muted} maxLength={maxLength} multiline={multiline} autoCapitalize="sentences"
      style={[styles.input, focused && { borderColor: c.purple }, multiline && { minHeight: 110, textAlignVertical: 'top' }]} />
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 24, gap: 24 },
  label: { fontFamily: f.medium, fontSize: 15 },
  input: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border,
    borderRadius: 14, backgroundColor: c.background, color: c.ink, fontFamily: f.regular, fontSize: 15 },
  discover: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' },
  loading: { padding: 40, alignItems: 'center', gap: 14 },
});
