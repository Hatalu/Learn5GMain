-- ==============================================================================
-- Educational Media Hub: Initial Database Migration
-- Includes: Tables, Foreign Keys, Unique Constraints, Triggers, RLS & Storage
-- Safe to run multiple times (Idempotent)
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null check (role in ('member', 'dev')) default 'member',
  password text, -- เก็บข้อมูลรหัสผ่านสำหรับ Dev ตรวจสอบ/ส่งมอบให้ผู้เรียน
  premium_until timestamptz, -- วันหมดอายุ Premium (ค่าเริ่มต้น NULL แสดงผลเป็น '-')
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created earlier
alter table public.profiles add column if not exists password text;
alter table public.profiles add column if not exists premium_until timestamptz;

-- Index on profiles
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_role on public.profiles(role);

-- 2. MEDIA TABLE
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon_url text not null,
  subject text not null check (subject in ('คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ')),
  grade_level text[] not null default '{}',
  media_type text not null check (media_type in ('เกม', 'แบบฝึกหัด', 'แบบทดสอบ', 'สื่อ Interactive', 'วิดีโอ', 'อื่น ๆ')),
  access_tier text not null default 'premium' check (access_tier in ('free', 'premium')),
  game_url text not null,
  view_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes on media
create index if not exists idx_media_subject on public.media(subject);
create index if not exists idx_media_media_type on public.media(media_type);
create index if not exists idx_media_access_tier on public.media(access_tier);
create index if not exists idx_media_created_at on public.media(created_at desc);
create index if not exists idx_media_view_count on public.media(view_count desc);
create index if not exists idx_media_grade_level on public.media using gin(grade_level);

-- 3. FAVORITES TABLE
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_user_media_favorite unique (user_id, media_id)
);

-- Index on favorites
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_media_id on public.favorites(media_id);

-- 4. FUNCTION & TRIGGER: Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_media_updated_at on public.media;
create trigger set_media_updated_at
  before update on public.media
  for each row execute function public.handle_updated_at();

-- 5. FUNCTION: Atomic increment view count
create or replace function public.increment_media_view(p_media_id uuid)
returns void as $$
begin
  update public.media
  set view_count = view_count + 1
  where id = p_media_id;
end;
$$ language plpgsql security definer;

-- 6. SECURITY HELPER: Check if current auth user is a 'dev'
create or replace function public.is_dev()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'dev'
  );
$$;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.favorites enable row level security;

-- ==============================================================================
-- RLS POLICIES (with DROP POLICY IF EXISTS to allow safe re-runs)
-- ==============================================================================

-- PROFILES POLICIES
drop policy if exists "Authenticated users can read all profiles" on public.profiles;
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own username" on public.profiles;
create policy "Users can update own username"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (role = (select role from public.profiles where id = auth.uid()) or public.is_dev())
  );

drop policy if exists "Devs can insert profiles" on public.profiles;
create policy "Devs can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_dev() or auth.uid() = id);

drop policy if exists "Devs can update all profiles" on public.profiles;
create policy "Devs can update all profiles"
  on public.profiles for update
  to authenticated
  using (public.is_dev());

drop policy if exists "Devs can delete profiles" on public.profiles;
create policy "Devs can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_dev());

-- MEDIA POLICIES
drop policy if exists "Authenticated users can view media" on public.media;
drop policy if exists "Anyone can view media" on public.media;
create policy "Anyone can view media"
  on public.media for select
  to public
  using (true);

drop policy if exists "Only devs can insert media" on public.media;
create policy "Only devs can insert media"
  on public.media for insert
  to authenticated
  with check (public.is_dev());

drop policy if exists "Only devs can update media" on public.media;
create policy "Only devs can update media"
  on public.media for update
  to authenticated
  using (public.is_dev())
  with check (public.is_dev());

drop policy if exists "Only devs can delete media" on public.media;
create policy "Only devs can delete media"
  on public.media for delete
  to authenticated
  using (public.is_dev());

-- FAVORITES POLICIES
drop policy if exists "Users can view own favorites" on public.favorites;
create policy "Users can view own favorites"
  on public.favorites for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.favorites;
create policy "Users can insert own favorites"
  on public.favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
  on public.favorites for delete
  to authenticated
  using (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET & POLICIES FOR MEDIA ICONS
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('media-icons', 'media-icons', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can read media-icons" on storage.objects;
create policy "Authenticated users can read media-icons"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media-icons');

drop policy if exists "Public can read media-icons" on storage.objects;
create policy "Public can read media-icons"
  on storage.objects for select
  to anon
  using (bucket_id = 'media-icons');

drop policy if exists "Devs can upload media icons" on storage.objects;
create policy "Devs can upload media icons"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media-icons'
    and public.is_dev()
  );

drop policy if exists "Devs can update media icons" on storage.objects;
create policy "Devs can update media icons"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media-icons'
    and public.is_dev()
  );

drop policy if exists "Devs can delete media icons" on storage.objects;
create policy "Devs can delete media icons"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media-icons'
    and public.is_dev()
  );
