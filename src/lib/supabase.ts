import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
// Enable only after the project sends OTP emails, rather than its default magic link.
export const emailLoginEnabled = process.env.EXPO_PUBLIC_EMAIL_LOGIN_ENABLED === 'true';

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
