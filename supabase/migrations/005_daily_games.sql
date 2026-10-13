-- ==============================================================================
-- 005: เกมประจำวัน (Daily Game)
-- Dev ตั้งเกมประจำวันล่วงหน้าได้ที่หน้า Dev > "เกมประจำวัน"
-- ถ้าวันไหนไม่ได้ตั้งไว้ ระบบเลือกเกมให้อัตโนมัติ (ทุกคนเห็นตรงกัน)
-- unlock = true  -> เกม Premium เล่นได้ฟรี "เฉพาะวันนั้น"
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.daily_games (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  media_id uuid not null references public.media(id) on delete cascade,
  unlock boolean not null default true,
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_games_day on public.daily_games(day);

alter table public.daily_games enable row level security;

-- ทุกคน (รวมผู้เยี่ยมชม) อ่านได้ เพราะต้องแสดงบนหน้าแรก
drop policy if exists "Anyone can read daily games" on public.daily_games;
create policy "Anyone can read daily games"
  on public.daily_games for select
  to anon, authenticated
  using (true);

-- เขียน/แก้/ลบ ได้เฉพาะ Dev
drop policy if exists "Devs insert daily games" on public.daily_games;
create policy "Devs insert daily games"
  on public.daily_games for insert
  to authenticated
  with check (public.is_dev());

drop policy if exists "Devs update daily games" on public.daily_games;
create policy "Devs update daily games"
  on public.daily_games for update
  to authenticated
  using (public.is_dev())
  with check (public.is_dev());

drop policy if exists "Devs delete daily games" on public.daily_games;
create policy "Devs delete daily games"
  on public.daily_games for delete
  to authenticated
  using (public.is_dev());

grant select on public.daily_games to anon, authenticated;
grant insert, update, delete on public.daily_games to authenticated;

notify pgrst, 'reload schema';
