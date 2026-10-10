import type { User } from '@supabase/supabase-js';
import { validateProfileAnswers } from './profile-fields';
import type { ProfileAnswers } from './profile-fields';
import { supabase } from './supabase';

export type StudentProfile = {
  id: string;
  display_name: string;
  program: string;
  year_label: string;
  bio: string;
  is_discoverable: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  contact_email: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_COLUMNS = 'id,display_name,program,year_label,bio,is_discoverable,contact_email,moderation_status,created_at,updated_at';
const DIRECTORY_COLUMNS = 'id,display_name,program,year_label,bio,contact_email';

export async function getMyProfile(userId: string): Promise<StudentProfile | null> {
  if (!supabase) throw new Error('Profiles are unavailable right now.');
  const { data, error } = await supabase.from('student_profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw new Error('Your profile could not be loaded. Please try again.');
  return data as StudentProfile | null;
}

export async function saveMyProfile(user: User, answers: ProfileAnswers): Promise<StudentProfile> {
  if (!supabase) throw new Error('Profiles are unavailable right now.');
  const fields = validateProfileAnswers(answers, user.email_confirmed_at ? user.email : undefined);
  const { data, error } = await supabase.from('student_profiles').upsert({
    id: user.id,
    ...fields,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select(PROFILE_COLUMNS).single();
  if (error || !data) throw new Error('Your profile could not be saved. Please try again.');
  return data as StudentProfile;
}

export type DirectoryProfile = Pick<StudentProfile, 'id' | 'display_name' | 'program' | 'year_label' | 'bio' | 'contact_email'>;

export async function findStudentProfiles(programQuery: string, page = 0): Promise<DirectoryProfile[]> {
  if (!supabase) throw new Error('Profiles are unavailable right now.');
  let query = supabase.from('student_profiles').select(DIRECTORY_COLUMNS).eq('is_discoverable', true)
    .order('display_name', { ascending: true }).range(page * 24, page * 24 + 23);
  const term = programQuery.trim().slice(0, 120);
  if (term) query = query.ilike('program', `%${term.replace(/[\\%_]/g, '\\$&')}%`);
  const { data, error } = await query;
  if (error) throw new Error('Student profiles could not be loaded. Please try again.');
  return (data ?? []) as DirectoryProfile[];
}

export async function getDiscoverableProfile(id: string): Promise<DirectoryProfile | null> {
  if (!supabase) throw new Error('Profiles are unavailable right now.');
  const { data, error } = await supabase.from('student_profiles').select(DIRECTORY_COLUMNS)
    .eq('id', id).eq('is_discoverable', true).maybeSingle();
  if (error) throw new Error('This profile could not be loaded. Please try again.');
  return data as DirectoryProfile | null;
}
