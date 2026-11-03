import { supabase } from './supabase';
export type NotificationPreferences = { enabled: boolean; venues: string[]; available: boolean; registered: boolean };
export async function notificationRequest(action: 'preferences' | 'save' | 'register' | 'unregister', payload: Record<string, unknown> = {}): Promise<NotificationPreferences> {
  if (!supabase) throw Error('Notifications are unavailable.');
  const { data, error } = await supabase.rpc('nightlife_notifications', { p_action: action, p_payload: payload });
  if (error) throw Error(error.code === '42501' ? 'Sign in again to manage notifications.' : 'Could not update notifications. Please wait a moment and retry.');
  return data as NotificationPreferences;
}
