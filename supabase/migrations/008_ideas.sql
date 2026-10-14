-- ==============================================================================
-- 008: กล่องไอเดีย (สมาชิกส่งไอเดียสื่อใหม่ถึง Dev)
-- เพิ่มได้เฉพาะสมาชิกที่สิทธิ์ยังไม่หมดอายุ (และเป็นเจ้าของแถวเอง) อ่าน/แก้/ลบได้เฉพาะ Dev
-- ต้องรัน 006 (is_premium_active) ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  username text not null,
  subject text not null check (char_length(subject) between 1 and 60),
  topic text not null check (char_length(topic) between 1 and 120),
  grade text not null check (char_length(grade) between 1 and 40),
  idea text not null check (char_length(idea) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ideas_created on public.ideas(created_at desc);

alter table public.ideas enable row level security;

drop policy if exists "Members insert own ideas" on public.ideas;
create policy "Members insert own ideas"
  on public.ideas for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_premium_active());

drop policy if exists "Devs read ideas" on public.ideas;
create policy "Devs read ideas"
  on public.ideas for select
  to authenticated
  using (public.is_dev());

drop policy if exists "Devs update ideas" on public.ideas;
create policy "Devs update ideas"
  on public.ideas for update
  to authenticated
  using (public.is_dev())
  with check (public.is_dev());

drop policy if exists "Devs delete ideas" on public.ideas;
create policy "Devs delete ideas"
  on public.ideas for delete
  to authenticated
  using (public.is_dev());
