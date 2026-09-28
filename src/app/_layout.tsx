import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Lora_400Regular, Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import { Feather } from '@expo/vector-icons';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from '../components/Shell';
import { LocalState } from '../lib/state';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({ DM: DMSans_400Regular, 'DM-Medium': DMSans_500Medium, 'DM-Bold': DMSans_700Bold, Lora: Lora_400Regular, 'Lora-Italic': Lora_400Regular_Italic, ...Feather.font });
  if (!loaded && !error) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: colors.background }}><ActivityIndicator color={colors.purple} /><Text style={{ color: colors.purple }}>Your campus, a little closer.</Text></View>;
  return <SafeAreaProvider><LocalState><StatusBar style="dark" /><Shell><Slot /></Shell></LocalState></SafeAreaProvider>;
}
