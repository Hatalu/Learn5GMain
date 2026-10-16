-- ==============================================================================
-- 015: ระบบสร้างเกมจาก Template (คลังเกมของสมาชิก + ห้องเล่นสดด้วยเลขห้อง 6 หลัก)
--
-- user_games    เกมที่สมาชิกสร้าง (เจ้าของอ่าน/เขียนเองผ่าน RLS เขียนได้เฉพาะสมาชิกที่สิทธิ์ยังไม่หมด)
--               ไม่เกี่ยวกับตาราง media จึงไม่ขึ้นในหน้าหลัก
-- game_rooms    ห้องที่เปิดเล่น (เก็บสำเนาเนื้อหาตอนเปิดห้อง) เจ้าของห้องอ่านได้ / เขียนผ่านเซิร์ฟเวอร์เท่านั้น
-- room_players  ผู้เล่นในห้อง (ไม่ต้องมีบัญชี ใช้โทเคนลับที่เก็บแบบ hash)
-- room_answers  คำตอบรายข้อ (ใช้สรุปผลรายข้อให้ครู)
-- storage       bucket game-media (สาธารณะ อ่านได้ทุกคน อัปโหลดได้เฉพาะสมาชิก ลงโฟลเดอร์ <user id>/ ของตัวเอง)
--
-- ต้องรัน 006/010 (is_premium_active) ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

-- 1) คลังเกมของสมาชิก --------------------------------------------------------
create table if not exists public.user_games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  template text not null default 'quiz' check (template ~ '^[a-z0-9_-]{1,30}$'),
  content jsonb not null default '{}'::jsonb check (octet_length(content::text) <= 600000),
  question_count integer not null default 0 check (question_count between 0 and 500),
  play_count integer not null default 0,
  cover_url text check (cover_url is null or char_length(cover_url) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_games_owner on public.user_games(owner_id, updated_at desc);

drop trigger if exists set_user_games_updated_at on public.user_games;
create trigger set_user_games_updated_at
  before update on public.user_games
  for each row execute function public.handle_updated_at();

-- กันสร้างเกมเกินคนละ 300 เกม
create or replace function public.user_games_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.user_games where owner_id = new.owner_id) >= 300 then
    raise exception 'game quota exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists user_games_quota on public.user_games;
create trigger user_games_quota
  before insert on public.user_games
  for each row execute function public.user_games_quota();

-- จำนวนครั้งที่เปิดเล่นแก้จากเบราว์เซอร์ไม่ได้ (เซิร์ฟเวอร์เพิ่มให้ตอนเปิดห้อง)
create or replace function public.user_games_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.play_count := 0;
    else
      new.play_count := old.play_count;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists user_games_guard on public.user_games;
create trigger user_games_guard
  before insert or update on public.user_games
  for each row execute function public.user_games_guard();

alter table public.user_games enable row level security;

drop policy if exists "Owners read own games" on public.user_games;
create policy "Owners read own games"
  on public.user_games for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Members insert own games" on public.user_games;
create policy "Members insert own games"
  on public.user_games for insert to authenticated
  with check (owner_id = auth.uid() and public.is_premium_active());

drop policy if exists "Members update own games" on public.user_games;
create policy "Members update own games"
  on public.user_games for update to authenticated
  using (owner_id = auth.uid() and public.is_premium_active())
  with check (owner_id = auth.uid() and public.is_premium_active());

drop policy if exists "Owners delete own games" on public.user_games;
create policy "Owners delete own games"
  on public.user_games for delete to authenticated
  using (owner_id = auth.uid());

-- 2) ห้องเล่นสด ---------------------------------------------------------------
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[0-9]{6}$'),
  game_id uuid references public.user_games(id) on delete set null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  template text not null default 'quiz',
  content jsonb not null,
  mode text not null default 'watch' check (mode in ('watch', 'play')),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'ended', 'closed')),
  background jsonb not null default '{"kind":"preset","id":"sky"}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  round integer not null default 1,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);
-- เลขห้องซ้ำกันได้เฉพาะห้องที่ปิดแล้ว
create unique index if not exists uq_game_rooms_open_code on public.game_rooms(code) where status <> 'closed';
create index if not exists idx_game_rooms_host on public.game_rooms(host_id, created_at desc);

drop trigger if exists set_game_rooms_updated_at on public.game_rooms;
create trigger set_game_rooms_updated_at
  before update on public.game_rooms
  for each row execute function public.handle_updated_at();

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 16),
  avatar smallint not null default 0 check (avatar between 0 and 31),
  token_hash text not null,
  is_host boolean not null default false,
  score integer not null default 0,
  correct integer not null default 0,
  answered integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_correct boolean,
  q_pos integer not null default 0,
  q_started_at timestamptz,
  finished_at timestamptz,
  kicked boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_room_players_room on public.room_players(room_id);
create unique index if not exists uq_room_players_nick on public.room_players(room_id, lower(nickname)) where not kicked;

create table if not exists public.room_answers (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  player_id uuid not null references public.room_players(id) on delete cascade,
  q_index integer not null,
  picks text[] not null default '{}',
  correct boolean not null,
  points integer not null default 0,
  ms integer not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, q_index)
);
create index if not exists idx_room_answers_room on public.room_answers(room_id);

alter table public.game_rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_answers enable row level security;

-- เจ้าของห้องอ่านห้องของตัวเองได้ (ใช้แสดง "ห้องที่เปิดอยู่" ในคลังเกม) / การเขียนทั้งหมดผ่านเซิร์ฟเวอร์
drop policy if exists "Hosts read own rooms" on public.game_rooms;
create policy "Hosts read own rooms"
  on public.game_rooms for select to authenticated
  using (host_id = auth.uid());
revoke all on public.room_players from anon, authenticated;
revoke all on public.room_answers from anon, authenticated;

-- 3) ที่เก็บรูป/คลิปของเกม --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'game-media', 'game-media', true, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload own game media" on storage.objects;
create policy "Members upload own game media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'game-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_premium_active()
  );

drop policy if exists "Owners read own game media" on storage.objects;
create policy "Owners read own game media"
  on storage.objects for select to authenticated
  using (bucket_id = 'game-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners delete own game media" on storage.objects;
create policy "Owners delete own game media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'game-media' and (storage.foldername(name))[1] = auth.uid()::text);
