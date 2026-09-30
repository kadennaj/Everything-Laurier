import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { publicSupabasePublishableKey, publicSupabaseUrl } from './public-supabase-config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || publicSupabaseUrl;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || publicSupabasePublishableKey;
// The connected project sends OTP codes. An explicit false can disable sign-in locally.
export const emailLoginEnabled = process.env.EXPO_PUBLIC_EMAIL_LOGIN_ENABLED !== 'false';

const nativeStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

// Missing setup must leave public browsing usable, including during static export.
export const supabase = url && key ? createClient(url, key, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: nativeStorage, lock: processLock } : {}),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
}) : null;
