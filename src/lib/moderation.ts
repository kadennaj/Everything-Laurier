import { supabase } from './supabase';
export const reportReasons = [
  { id: 'harassment', label: 'Harassment or threats' }, { id: 'hate', label: 'Hate or discrimination' },
  { id: 'sexual', label: 'Sexual content' }, { id: 'violence', label: 'Violence or dangerous activity' },
  { id: 'privacy', label: 'Private information' }, { id: 'spam', label: 'Spam or impersonation' },
  { id: 'misleading', label: 'Misleading information' }, { id: 'rights', label: 'Content rights concern' },
] as const;
export type ReportReason = typeof reportReasons[number]['id'];
export type ProfileBlock = { target_id: string; display_name: string; created_at: string };
export async function reportContent(kind: 'profile' | 'post', target: string, reason: ReportReason) {
  if (!supabase) throw new Error('Reporting is unavailable. Email everythinglaurier@gmail.com for help.');
  const { error } = await supabase.rpc('report_content', { p_kind: kind, p_target: target, p_reason: reason });
  if (error) throw new Error('Your report could not be saved. Try again or email everythinglaurier@gmail.com.');
}
export async function changeProfileBlock(target: string, block: boolean) {
  if (!supabase) throw new Error('Profile controls are unavailable.');
  const { error } = await supabase.rpc('change_profile_block', { p_target: target, p_block: block });
  if (error) throw new Error('Your block list could not be updated. Please try again.');
}
export async function getProfileBlocks(): Promise<ProfileBlock[]> {
  if (!supabase) throw new Error('Profile controls are unavailable.');
  const { data, error } = await supabase.rpc('my_profile_blocks');
  if (error) throw new Error('Your blocked profiles could not be loaded.');
  return data ?? [];
}
