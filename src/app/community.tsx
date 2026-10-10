import React from 'react';
import { View } from 'react-native';
import { Button, Card, ExternalButton, PageHeading, T, body } from '../components/ui';
import { useLocal } from '../lib/state';
import { fonts as f } from '../lib/theme';
export default function Community() {
  const { hiddenSources, unhideSources, nightlifeAgeConfirmed, resetNightlifeAge } = useLocal();
  return <>
    <PageHeading eyebrow="SUPPORT & SAFETY" title="Community." subtitle="Make campus connections with care." />
    <Card style={{ padding: 22, gap: 15 }}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>Share respectfully</T>
      <T style={body}>No harassment, threats, hate, explicit sexual content, dangerous activity, impersonation, spam, or other people’s private information. Share your own profile and truthful line reports. Follow venue age requirements and local laws.</T>
      <T style={body}>New or edited shared profiles and imported posts are reviewed before publication. Reports go to the operator for review. Content can be removed and profiles restricted for violations.</T>
      <View style={{ alignItems: 'flex-start' }}><ExternalButton label="Full community rules" url="https://everythinglaurier.ca/community/" /></View>
    </Card>
    <Card style={{ padding: 22, gap: 15 }}>
      <T accessibilityRole="header" style={{ fontFamily: f.bold, fontSize: 21 }}>Report, block & get help</T>
      <T style={body}>Use Report profile or Report post to flag a concern. Block profile hides directory profiles in both directions; manage blocks in Your space. Hide this source removes that venue’s posts from this device. Blocking cannot recall email addresses already received or prevent contact outside the app.</T>
      <T selectable style={body}>Support and privacy: everythinglaurier@gmail.com</T>
      <View style={{ alignItems: 'flex-start' }}><ExternalButton label="Support page" url="https://everythinglaurier.ca/support/" /></View>
      <T muted style={{ lineHeight: 21 }}>The app is not an emergency service. Contact emergency services if there is immediate danger.</T>
      {nightlifeAgeConfirmed && <Button secondary label="Reset nightlife age choice" onPress={resetNightlifeAge} />}
      {!!hiddenSources.length && <><T style={body}>{hiddenSources.length} hidden feed {hiddenSources.length === 1 ? 'source' : 'sources'} on this device.</T><Button secondary label="Show hidden sources again" onPress={unhideSources} /></>}
    </Card>
  </>;
}
