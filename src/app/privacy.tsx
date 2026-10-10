import React from 'react';
import { View } from 'react-native';
import { Card, ExternalButton, PageHeading, T, body } from '../components/ui';
import { fonts as f } from '../lib/theme';
import { privacyPolicyUrl } from '../lib/privacy';

export default function Privacy() {
  return <>
    <PageHeading eyebrow="YOUR INFORMATION" title="Privacy." subtitle="Understand what you share and stay in control." />
    <Card style={{ padding: 22, gap: 16 }}>
      <T accessibilityRole="header" style={{ fontSize: 20, fontFamily: f.bold }}>Privacy policy</T>
      <T style={body}>The full policy explains how Everything Laurier uses your information, which services process it, and how long it is retained.</T>
      {privacyPolicyUrl ? <View style={{ alignItems: 'flex-start' }}><ExternalButton label="Read privacy policy" url={privacyPolicyUrl} secondary={false} /></View>
        : <T accessibilityRole="alert" style={body}>The public privacy policy is being prepared. This preview is not ready for App Store release.</T>}
    </Card>
    <Card style={{ padding: 22, gap: 14 }}>
      <T accessibilityRole="header" style={{ fontSize: 20, fontFamily: f.bold }}>What you share</T>
      <T style={body}>Signing in uses your email and an account identifier. Your profile stores the name and program you enter, plus your optional year and introduction. Your profile stays private unless you choose to let other signed-in students find and email you.</T>
      <T style={body}>Line reports are linked to your account privately. Other users see venue estimates, not individual reporters. Bookmarks, hidden feed sources, and the nightlife age choice stay on this device.</T>
      <T style={body}>Supabase processes account and profile data over HTTPS. Resend delivers sign-in emails. Embedded Instagram images and external websites may receive your IP address and ordinary connection details. The app has no advertising tracking or third-party AI features.</T>
    </Card>
    <Card style={{ padding: 22, gap: 14 }}>
      <T accessibilityRole="header" style={{ fontSize: 20, fontFamily: f.bold }}>Your choices</T>
      <T style={body}>You can explore as a guest, turn profile discovery off in your profile, clear saved items, or permanently delete your account from Your space. Account deletion removes your live account, profile, line reports, linked reports and blocks, and clears this device’s saved items and preferences.</T>
    </Card>
  </>;
}
