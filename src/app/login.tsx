import { Redirect, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Icon, T, body } from '../components/ui';
import { useAuth } from '../lib/auth';
import { AUTH_UNAVAILABLE } from '../lib/auth-flow';
import { colors as c, fonts as f } from '../lib/theme';
import { BrandLogo } from '../components/BrandLogo';

export default function Login() {
  const { session, ready, configured, recoveryError, pendingEmail, cooldownEmail, resendAvailableAt, busy, sendCode, verifyCode, changeEmail } = useAuth();
  const [email, setEmail] = useState(pendingEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const codeInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const isVerifying = !!pendingEmail;
  const currentEmail = (pendingEmail || email).trim().toLowerCase();
  const remaining = currentEmail === cooldownEmail ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!resendAvailableAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  useEffect(() => {
    if (isVerifying) codeInput.current?.focus();
  }, [isVerifying]);

  async function send() {
    setError(''); setNotice('');
    try {
      await sendCode(pendingEmail || email);
      setNow(Date.now());
      setCode('');
      setNotice('Code requested. Check your inbox and spam folder.');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Please try again.');
    }
  }

  async function verify() {
    setError(''); setNotice('');
    try { await verifyCode(code); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); }
  }

  if (!ready) return <View style={styles.loading}><ActivityIndicator color={c.purple} /><T muted>Checking your account…</T></View>;
  if (session) return <Redirect href="/account-setup" />;

  return <View style={styles.container}>
    <View style={styles.intro}>
      <BrandLogo size={104} />

      <T accessibilityRole="header" style={styles.heading}>{isVerifying ? 'Check your inbox.' : 'Welcome to Laurier.'}</T>
      <T style={[body, { textAlign: 'center' }]}>{isVerifying ? 'One small step, and you’re in.' : 'Sign in or create an account with your email. No password to remember.'}</T>
    </View>
    <Card style={styles.form}>
      <View style={{ gap: 8 }}>
        <T style={{ fontFamily: f.bold, fontSize: 19 }}>{isVerifying ? 'Enter your verification code' : 'Let’s get you signed in'}</T>
        <T muted style={{ lineHeight: 22 }}>{isVerifying ? `Enter the code sent to ${pendingEmail}.` : 'We’ll email you a one-time code to verify it’s you.'}</T>
      </View>
      {isVerifying ? <View style={{ gap: 8 }}>
        <T style={styles.label}>Verification code</T>
        <TextInput ref={codeInput} accessibilityLabel="Verification code" value={code} onChangeText={value => { setCode(value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
          placeholder="Enter your code" placeholderTextColor={c.muted} style={[styles.input, styles.code]} keyboardType="number-pad" inputMode="numeric"
          textContentType="oneTimeCode" autoComplete="one-time-code" autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!busy}
          returnKeyType="done" onSubmitEditing={() => { if (!busy) void verify(); }} />
      </View> : <View style={{ gap: 8 }}>
        <T style={styles.label}>Email address</T>
        <TextInput ref={emailInput} accessibilityLabel="Email address" value={email} onChangeText={value => { setEmail(value); setError(''); }}
          placeholder="you@example.com" placeholderTextColor={c.muted} style={styles.input} keyboardType="email-address" inputMode="email"
          textContentType="emailAddress" autoComplete="email" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy}
          returnKeyType="go" onSubmitEditing={() => { if (!busy && configured && !remaining) void send(); }} />
      </View>}
      {(!configured || error || recoveryError) ? <View accessibilityRole="alert" style={styles.error}><T style={{ color: '#8E3434', lineHeight: 22 }}>{!configured ? AUTH_UNAVAILABLE : error || recoveryError}</T></View> : null}
      {!!notice && <T accessibilityLiveRegion="polite" style={{ color: c.green, lineHeight: 22 }}>{notice}</T>}
      <Button label={busy ? (isVerifying ? 'Please wait…' : 'Sending code…') : isVerifying ? 'Verify & sign in' : remaining ? `Send another code in ${remaining}s` : 'Send verification code'}
        loading={busy} icon={busy ? undefined : isVerifying ? 'check-circle' : 'mail'} disabled={busy || !configured || (!isVerifying && remaining > 0)}
        onPress={() => { void (isVerifying ? verify() : send()); }} />
      {isVerifying && <>
        <T muted style={{ fontSize: 12, lineHeight: 20 }}>Can’t find it? Check your spam folder. Use the latest code if you requested more than one.</T>
        <Button secondary label={remaining ? `Resend code in ${remaining}s` : 'Resend code'} disabled={busy || remaining > 0} onPress={() => { void send(); }} />
        <Button secondary label="Use a different email" disabled={busy} onPress={() => { setEmail(pendingEmail); changeEmail(); setCode(''); setError(''); setNotice(''); }} />
      </>}
      <View style={styles.privacy}><Icon name="lock" size={15} color={c.muted} /><T muted style={{ fontSize: 12, lineHeight: 19, flex: 1 }}>Your email code replaces a password. After signing in, you can create your student profile. You choose whether it appears in search.</T></View>
    </Card>
    <Button secondary label="Continue exploring" icon="arrow-right" disabled={busy} onPress={() => router.replace('/')} />
    <Button secondary label="Privacy policy" icon="shield" onPress={() => router.push('/privacy')} />
    <T muted style={{ fontSize: 12, textAlign: 'center', lineHeight: 20 }}>New here? Your account is created when you verify your email.</T>
  </View>;
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 18, paddingVertical: 8 },
  intro: { alignItems: 'center', gap: 12 },
  heading: { fontFamily: f.bold, fontSize: 31, lineHeight: 38, letterSpacing: -0.4, textAlign: 'center' },
  form: { padding: 24, gap: 20 },
  label: { fontFamily: f.bold, fontSize: 13 },
  input: { minHeight: 54, borderWidth: 1, borderColor: c.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, color: c.ink, fontFamily: f.regular, fontSize: 16, backgroundColor: c.background },
  code: { fontFamily: f.medium, letterSpacing: 3, fontSize: 20 },
  error: { padding: 12, backgroundColor: '#FAEEEE', borderRadius: 10 },
  privacy: { flexDirection: 'row', gap: 9, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border },
  loading: { padding: 40, alignItems: 'center', gap: 15 },
});
