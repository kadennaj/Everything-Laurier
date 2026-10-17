import { supabase } from './supabase';
export const TERMS_VERSION = '2026-10-17';
export type PrivacySummary = {
 consent: { terms_version: string; privacy_version: string; accepted_at: string; age_16_confirmed: boolean } | null;
 profile: { name: string; program: string; discoverable: boolean } | null;
 applications: number; reports: number; blocks: number;
};
export async function privacyRequest<T>(action: 'summary' | 'accept' | 'export' | 'hide_profile'): Promise<T> {
 if (!supabase) throw Error('Account controls are unavailable. Contact everythinglaurier@gmail.com.');
 const { data, error } = await supabase.rpc('account_privacy', { p_action: action, p_payload: action === 'accept' ? { terms_version: TERMS_VERSION, age_16_confirmed: true } : {} });
 if (error) throw Error(error.code === '42501' ? 'Sign in again to manage your data.' : 'Could not complete this request. Wait a moment and retry, or contact privacy support.');
 return data as T;
}
