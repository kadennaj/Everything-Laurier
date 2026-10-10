import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, ExternalButton, Icon, PageHeading, T, body, s } from '../components/ui';
import { useLocal } from '../lib/state';
import { colors as c, fonts as f } from '../lib/theme';
import { AccountCard } from '../components/AccountCard';
import { StudentProfileCard } from '../components/StudentProfileCard';
import { BlockedProfiles } from '../components/BlockedProfiles';
import { DeleteAccountCard } from '../components/DeleteAccountCard';

export default function Profile() {
  const { saved, clearSaved } = useLocal(); const [confirm, setConfirm] = useState(false); const [showAbout, setShowAbout] = useState(false);
  return <><PageHeading eyebrow="YOUR ACCOUNT" title="Your space." subtitle="Your student profile, account, and the things you’ve saved." />
    <AccountCard />
    <StudentProfileCard />
    <Card style={{ padding: 20, gap: 12 }}><T style={{ fontFamily: f.bold, fontSize: 18 }}>Privacy & your information</T><T style={body}>Learn what you share and how to manage it.</T><View style={{ alignItems: 'flex-start' }}><Button secondary label="Privacy policy" icon="shield" onPress={() => router.push('/privacy')} /><Button secondary label="Community & support" icon="flag" onPress={() => router.push('/community')} /></View></Card>
    <BlockedProfiles />
    <DeleteAccountCard />
    <Card style={{ padding: 20, gap: 14 }}><View style={[s.row, { gap: 13 }]}><View style={{ backgroundColor: c.lavender, width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><Icon name="bookmark" size={23} color={c.purple} /></View><View style={{ flex: 1 }}><T style={{ fontSize: 18, fontFamily: f.bold }}>{saved.length} saved items</T><T muted style={{ marginTop: 3, fontSize: 12 }}>Clubs, venues, and plans for later.</T></View><Button secondary label="Open" onPress={() => router.push('/saved')} /></View></Card>
    <Card><Pressable accessibilityRole="button" accessibilityState={{ expanded: showAbout }} onPress={() => setShowAbout(value => !value)} style={({ pressed }) => [s.row, { minHeight: 64, paddingHorizontal: 20, gap: 13, opacity: pressed ? 0.7 : 1 }]}><View style={{ width: 42, height: 42, backgroundColor: c.lavender, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}><Icon name="info" color={c.purple} size={20} /></View><T style={{ flex: 1, fontFamily: f.bold, fontSize: 15 }}>About Everything Laurier</T><Icon name={showAbout ? 'chevron-up' : 'chevron-down'} color={c.purple} size={19} /></Pressable>{showAbout && <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 13 }}><T style={body}>A student-focused app for life around Laurier Waterloo. Student profiles and line reports are saved in Supabase. Shared profiles are reviewed before publication. Posts from our selected venues appear automatically; you can hide or report them.</T><T style={body}>There is no location tracking or in-app messaging. Bookmarks stay on this device. Everything Laurier is operated as a student app. Contact everythinglaurier@gmail.com for support or content concerns.</T><T style={{ fontFamily: f.bold, marginTop: 4 }}>Photo & design credits</T><T style={body}>Campus photograph: Schlegel Centre by LeonV, via Wikimedia Commons, licensed CC BY-SA 4.0. Displayed with a crop and colour overlay. Event artwork is original UI artwork.</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><ExternalButton label="Photo source" url="https://commons.wikimedia.org/wiki/File:Schlegel_Centre_(Laurier%27s_school_of_business_and_economics).JPG" /><ExternalButton label="CC BY-SA 4.0 licence" url="https://creativecommons.org/licenses/by-sa/4.0/" /><ExternalButton label="Students’ Union directory" url="https://www.yourstudentsunion.ca/club-listings" /></View></View>}</Card>
    {saved.length > 0 && <View style={{ gap: 13, alignItems: 'flex-start' }}><T muted style={{ fontSize: 12 }}>Local storage</T>{confirm ? <><T>Clear all saved items on this device?</T><View style={[s.row, { gap: 10 }]}><Button label="Yes, clear saved items" onPress={() => { clearSaved(); setConfirm(false); }} /><Button secondary label="Keep them" onPress={() => setConfirm(false)} /></View></> : <Button secondary label="Clear saved items" icon="trash-2" onPress={() => setConfirm(true)} />}</View>}
  </>;
}
