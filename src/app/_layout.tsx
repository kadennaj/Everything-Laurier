import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { Feather } from '@expo/vector-icons';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from '../components/Shell';
import { LocalState } from '../lib/state';
import { colors } from '../lib/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { OfficialEventsProvider } from '../lib/official-events';
import { BrandLogo } from '../components/BrandLogo';

function AccountRoutes() {
  const { session } = useAuth();
  // Drop route-local profile data when accounts change or are deleted.
  return <Slot key={session?.user.id ?? 'guest'} />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ DM: DMSans_400Regular, 'DM-Medium': DMSans_500Medium, 'DM-Semibold': DMSans_600SemiBold, ...Feather.font });
  if (!loaded && !error) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: colors.background }}><BrandLogo size={160} /><ActivityIndicator color={colors.purple} /><Text style={{ color: colors.purple }}>Your campus, a little closer.</Text></View>;
  return <SafeAreaProvider><LocalState><AuthProvider><OfficialEventsProvider><StatusBar style="dark" /><Shell><AccountRoutes /></Shell></OfficialEventsProvider></AuthProvider></LocalState></SafeAreaProvider>;
}
