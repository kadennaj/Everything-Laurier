import React from 'react';
import { View } from 'react-native';
import { Button, Card, ExternalButton, PageHeading, T, body } from '../components/ui';
import { useLocal } from '../lib/state';
import { fonts as f } from '../lib/theme';
import { instagramAccounts } from '../lib/instagram-feed';
export default function Community() {
  const { hiddenSources, unhideSource, unhideSources, hiddenPosts, unhidePosts, ready, nightlifeAgeConfirmed, resetNightlifeAge } = useLocal();
  return <>
    <PageHeading eyebrow="SUPPORT & SAFETY" title="Community" subtitle="Make campus connections with care." />
    <Card style={{ padding: 22, gap: 15 }}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>Share respectfully</T>
      <T style={body}>No harassment, threats, hate, explicit sexual content, dangerous activity, impersonation, spam, or other people’s private information. Share your own profile and truthful line reports. Follow venue age requirements and local laws.</T>
      <T style={body}>Shared profiles and edits are checked by the owner before appearing. Posts from our selected venues appear automatically. Reports go to the operator for review. Content can be removed and profiles restricted for violations.</T>
      <View style={{ alignItems: 'flex-start' }}><ExternalButton label="Full community rules" url="https://everythinglaurier.ca/community/" /></View>
    </Card>
    <Card style={{ padding: 22, gap: 15 }}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>Report, block & get help</T>
      <T style={body}>Open a post’s three-dot menu to report it, hide that post, or hide the venue’s feed on this device. Use Report profile or Block profile on a student profile; blocking hides directory profiles in both directions. Manage profile blocks in Your space. Blocking cannot recall email addresses already received or prevent contact outside the app.</T>
      <T selectable style={body}>Support and privacy: everythinglaurier@gmail.com</T>
      <View style={{ alignItems: 'flex-start' }}><ExternalButton label="Support page" url="https://everythinglaurier.ca/support/" /></View>
      <T muted style={{ lineHeight: 21 }}>The app is not an emergency service. Contact emergency services if there is immediate danger.</T>
      {nightlifeAgeConfirmed && <Button secondary label="Reset nightlife age choice" onPress={resetNightlifeAge} />}
    </Card>
    {(!!hiddenSources.length || !!hiddenPosts.length) && <Card style={{ padding: 22, gap: 15 }}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>Your feed choices</T>
      <T style={body}>These choices stay on this device and do not remove posts for other people.</T>
      {!!hiddenPosts.length && <><T style={body}>{hiddenPosts.length} hidden {hiddenPosts.length === 1 ? 'post' : 'posts'}.</T><Button secondary label="Show hidden posts again" disabled={!ready} onPress={unhidePosts} /></>}
      {instagramAccounts.filter(account => hiddenSources.includes(account.username)).map(account => <View key={account.username} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><T style={body}>{account.name}</T><Button secondary label="Show venue again" disabled={!ready} onPress={() => unhideSource(account.username)} /></View>)}
      {hiddenSources.length > 1 && <Button secondary label="Show all venues again" disabled={!ready} onPress={unhideSources} />}
    </Card>}
  </>;
}
