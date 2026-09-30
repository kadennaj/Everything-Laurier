-- A row is created only after the student finishes the first-sign-in questionnaire.
-- Email contact is displayed only when the student explicitly opts into discovery.
create table public.student_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  program text not null check (char_length(btrim(program)) between 2 and 120),
  year_label text not null default '' check (char_length(year_label) <= 40),
  bio text not null default '' check (char_length(bio) <= 500),
  is_discoverable boolean not null default false,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discoverable_contact_required check (
    (is_discoverable and contact_email is not null) or
    (not is_discoverable and contact_email is null)
  )
);

alter table public.student_profiles enable row level security;
revoke all on public.student_profiles from anon;
grant select, insert, update on public.student_profiles to authenticated;

create policy "Students see their own and discoverable profiles"
on public.student_profiles for select to authenticated
using ((select auth.uid()) = id or is_discoverable);

create policy "Students create only their own profile"
on public.student_profiles for insert to authenticated
with check (
  (select auth.uid()) = id and
  (contact_email is null or lower(contact_email) = lower(((select auth.jwt()) ->> 'email')))
);

create policy "Students edit only their own profile"
on public.student_profiles for update to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id and
  (contact_email is null or lower(contact_email) = lower(((select auth.jwt()) ->> 'email')))
);
