-- ==============================================================================
-- 004: Learning Platform (ผู้ปกครอง / ครู / นักเรียน) + Security hardening
-- รันไฟล์นี้ครั้งเดียวใน Supabase SQL Editor (รันซ้ำได้ ปลอดภัย)
--
-- หลักการความปลอดภัย:
--   * ตารางใหม่ทุกตาราง เปิด RLS และ "ไม่มี policy" = เบราว์เซอร์เข้าถึงตรงๆ ไม่ได้เลย
--     ทุกการอ่าน/เขียนผ่าน API ฝั่งเซิร์ฟเวอร์ที่ตรวจสิทธิ์ (service role) เท่านั้น
--   * ลบรหัสผ่านแบบอ่านได้ออกจาก profiles
--   * สมาชิกแก้ premium_until / role ของตัวเองไม่ได้อีกต่อไป
-- ==============================================================================

-- 1) ลบรหัสผ่านแบบ plaintext (ต้องทำก่อน)
alter table public.profiles drop column if exists password;

-- 2) ขยาย role: member (เดิม) | dev | parent | teacher | student
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'dev', 'parent', 'teacher', 'student'));

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar text not null default 'bear';
alter table public.profiles add column if not exists grade text;
alter table public.profiles add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.profiles add column if not exists daily_limit_min integer check (daily_limit_min is null or daily_limit_min between 5 and 480);
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists last_seen_at timestamptz;
create index if not exists idx_profiles_owner on public.profiles(owner_id);

-- 3) RLS ของ profiles: อ่านได้เฉพาะแถวตัวเอง (Dev อ่านได้ทั้งหมด) และไม่มีการแก้ไขจากเบราว์เซอร์
drop policy if exists "Authenticated users can read all profiles" on public.profiles;
drop policy if exists "Users can update own username" on public.profiles;
drop policy if exists "Devs can insert profiles" on public.profiles;
drop policy if exists "Devs can update all profiles" on public.profiles;
drop policy if exists "Devs can delete profiles" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Devs read all profiles" on public.profiles;

create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Devs read all profiles"
  on public.profiles for select to authenticated
  using (public.is_dev());

-- 4) ข้อมูลหลักสูตรของสื่อ (สำหรับครู)
alter table public.media add column if not exists learning_goal text;
alter table public.media add column if not exists standards text[] not null default '{}';

-- 5) จำนวนครั้งที่เปิดเล่น: ให้เรียกได้เฉพาะเซิร์ฟเวอร์
revoke all on function public.increment_media_view(uuid) from public, anon, authenticated;
grant execute on function public.increment_media_view(uuid) to service_role;

-- 6) ข้อมูลล็อกอินของนักเรียน (รหัสนักเรียน + PIN แบบ hash) แยกตาราง เพื่อไม่ให้ใครอ่านได้
create table if not exists public.student_credentials (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  login_code text unique not null,
  pin_hash text not null,
  pin_failures integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- 7) ห้องเรียน
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  grade text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_classes_teacher on public.classes(teacher_id);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index if not exists idx_class_members_student on public.class_members(student_id);

-- 8) งานที่มอบหมาย
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  note text check (note is null or char_length(note) <= 300),
  due_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, media_id)
);
create index if not exists idx_assignments_class on public.assignments(class_id);

-- 9) การเล่น
create table if not exists public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_beat_at timestamptz not null default now(),
  seconds integer not null default 0 check (seconds >= 0)
);
create index if not exists idx_play_sessions_student_day on public.play_sessions(student_id, started_at desc);

create table if not exists public.play_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  session_id uuid references public.play_sessions(id) on delete set null,
  level_key text not null default 'main' check (char_length(level_key) <= 60),
  score integer not null default 0 check (score between 0 and 100000),
  stars smallint not null default 0 check (stars between 0 and 3),
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= 0),
  duration_sec integer not null default 0 check (duration_sec between 0 and 7200),
  mistakes jsonb not null default '[]'::jsonb,
  played_at timestamptz not null default now()
);
create index if not exists idx_play_results_student on public.play_results(student_id, played_at desc);
create index if not exists idx_play_results_media on public.play_results(media_id);

-- 10) ความก้าวหน้า / เกมมิฟิเคชัน
create table if not exists public.student_stats (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  stars_total integer not null default 0,
  bonus_stars integer not null default 0,
  plays_total integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_play_date date,
  last_freeze_week text,
  buddy_color text not null default 'violet',
  buddy_hat text,
  updated_at timestamptz not null default now()
);

create table if not exists public.student_badges (
  student_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (student_id, badge_key)
);

create table if not exists public.mission_claims (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  mission_key text not null,
  claimed_at timestamptz not null default now(),
  primary key (student_id, day, mission_key)
);

-- 11) คำขอ Premium (แอดมินอนุมัติ)
create table if not exists public.premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('family', 'classroom', 'school')),
  contact text not null check (char_length(contact) between 3 and 120),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_premium_requests_status on public.premium_requests(status, created_at desc);

-- 12) บันทึกเหตุการณ์ความปลอดภัย (ล็อกอินผิดซ้ำ, ลบบัญชี ฯลฯ)
create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  kind text not null,
  actor_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

-- 13) เปิด RLS ทุกตารางใหม่ + ไม่มี policy + ถอนสิทธิ์ของ anon/authenticated
do $$
declare t text;
begin
  foreach t in array array[
    'student_credentials','classes','class_members','assignments','play_sessions',
    'play_results','student_stats','student_badges','mission_claims','premium_requests','security_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

revoke all on sequence public.security_events_id_seq from anon, authenticated;

-- 14) ให้ PostgREST โหลดโครงสร้างใหม่ทันที
notify pgrst, 'reload schema';
