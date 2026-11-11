-- ==============================================================================
-- 029: กิจกรรมประกวดออกแบบใบงาน AI (ครูส่งภาพใบงาน + สูตร, กดใจผลงานคนอื่น, Top 3 ได้สมาชิกฟรี)
--   contests          กิจกรรม (ช่วงเวลา วันรางวัล) Dev สร้างผ่านหน้า Dev
--   contest_entries   ผลงาน (รูปอยู่ใน bucket game-media/<owner>/ นับโควต้าอัปโหลดเดิม) ต้องผ่านการอนุมัติก่อนขึ้นแกลเลอรี
--   contest_likes     ใจ 1 บัญชีต่อ 1 ผลงาน (fresh = บัญชีสมัครหลังกิจกรรมเริ่ม)
--   * อ่าน/เขียนผ่านเซิร์ฟเวอร์ (service role) เท่านั้น: เปิด RLS ไม่มี policy
--   * like_count ดูแลด้วย trigger
--   * media_in_use นับรูปของผลงานด้วย (ไม่งั้นตัวล้างไฟล์ที่ไม่ใช้จะลบรูปผลงานทิ้ง)
-- ต้องรัน 001 015 019 023 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  prize_days int[] not null default '{90,60,30}',
  join_days int not null default 0 check (join_days between 0 and 30),
  count_new boolean not null default true,
  awarded_at timestamptz,
  winners jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists contests_time_idx on public.contests (starts_at desc);

create table if not exists public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_name text not null default '',
  title text not null check (char_length(title) between 1 and 60),
  subject text not null default '',
  recipe jsonb not null default '{}'::jsonb check (octet_length(recipe::text) <= 4000),
  image_url text not null check (char_length(image_url) <= 400),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  like_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists contest_entries_list_idx on public.contest_entries (contest_id, status, like_count desc, created_at);
create index if not exists contest_entries_owner_idx on public.contest_entries (owner_id, created_at desc);

create table if not exists public.contest_likes (
  entry_id uuid not null references public.contest_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  fresh boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);
create index if not exists contest_likes_user_idx on public.contest_likes (user_id);

alter table public.contests enable row level security;
alter table public.contest_entries enable row level security;
alter table public.contest_likes enable row level security;

-- นับใจใหม่ทุกครั้งที่เพิ่ม/ลบ (นับจริงจากตาราง ไม่บวกลบสะสม จะได้ไม่เพี้ยน)
create or replace function public.contest_like_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e uuid := coalesce(new.entry_id, old.entry_id);
begin
  update public.contest_entries
     set like_count = (select count(*) from public.contest_likes where entry_id = e)
   where id = e;
  return null;
end;
$$;

drop trigger if exists contest_like_sync on public.contest_likes;
create trigger contest_like_sync
  after insert or delete on public.contest_likes
  for each row execute function public.contest_like_sync();

-- เดิมจาก 023 + รูปผลงานประกวด
create or replace function public.media_in_use(p_uid uuid)
returns table (path text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct m[1]
  from (
    select regexp_matches(g.content::text, p_uid::text || '/[A-Za-z0-9._-]+', 'g') as m
    from public.user_games g
    union all
    select regexp_matches(r.content::text || r.background::text || r.settings::text, p_uid::text || '/[A-Za-z0-9._-]+', 'g')
    from public.game_rooms r
    where r.status <> 'closed'
    union all
    select regexp_matches(coalesce(g2.cover_url, ''), p_uid::text || '/[A-Za-z0-9._-]+', 'g')
    from public.user_games g2
    union all
    select regexp_matches(d.content::text, p_uid::text || '/[A-Za-z0-9._-]+', 'g')
    from public.user_designs d
    union all
    select regexp_matches(e.image_url, p_uid::text || '/[A-Za-z0-9._-]+', 'g')
    from public.contest_entries e
    where e.owner_id = p_uid
  ) x;
$$;
revoke all on function public.media_in_use(uuid) from public, anon, authenticated;
grant execute on function public.media_in_use(uuid) to service_role;
