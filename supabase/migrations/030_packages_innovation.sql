-- 030: แพ็กเกจรายเดือน Plus / Pro / Master + ตารางสิทธิ์ของแต่ละแพ็กเกจ (Dev แก้ได้ในหน้า Dev)
--      + ระบบสั่งทำนวัตกรรมตามแผนการสอน (เฉพาะ Master)
-- รันซ้ำได้ ไม่ลบข้อมูลเดิม
--
-- สิทธิ์ (ค่า null = ไม่จำกัด):
--   sets / designs       จำนวนชุดคำถาม / สื่อการสอนที่มีได้ (บัญชีฟรีนับ "ตลอดอายุบัญชี" ลบแล้วไม่คืน)
--   upload_mb            พื้นที่รูป/คลิปรวมต่อบัญชี
--   discover             ดู/ทำสำเนา/เปิดห้องจากผลงาน Public ของคนอื่น
--   ai_game / worksheet  ใช้ตัวสร้างเกม AI / ใบงาน AI
--   innovation_jobs      สั่งทำนวัตกรรมได้กี่งานต่อเดือน (0 = ไม่มีสิทธิ์)
--   innovation_revisions ขอแก้ได้กี่ครั้งต่องาน
--   extra                ข้อความเพิ่มบนการ์ดแพ็กเกจ (บรรทัดละ 1 ข้อ)

-- 1) แพ็กเกจของบัญชี (ใช้คู่กับ premium_until = วันหมดอายุ)
alter table public.profiles add column if not exists plan text;
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan is null or plan in ('plus', 'pro', 'master'));

-- 2) ตารางสิทธิ์
create table if not exists public.plan_entitlements (
  tier text primary key check (tier in ('free', 'plus', 'pro', 'master')),
  sets integer check (sets is null or sets >= 0),
  designs integer check (designs is null or designs >= 0),
  upload_mb integer not null default 5 check (upload_mb between 0 and 2000),
  discover boolean not null default false,
  ai_game boolean not null default true,
  worksheet boolean not null default true,
  innovation_jobs integer not null default 0 check (innovation_jobs between 0 and 50),
  innovation_revisions integer not null default 0 check (innovation_revisions between 0 and 50),
  extra text not null default '' check (char_length(extra) <= 1000),
  updated_at timestamptz not null default now()
);

insert into public.plan_entitlements (tier, sets, designs, upload_mb, discover, ai_game, worksheet, innovation_jobs, innovation_revisions) values
  ('free',   2,    3,    5,   false, true, true, 0, 0),
  ('plus',   null, null, 30,  true,  true, true, 0, 0),
  ('pro',    null, null, 60,  true,  true, true, 0, 0),
  ('master', null, null, 100, true,  true, true, 2, 3)
on conflict (tier) do nothing;

alter table public.plan_entitlements enable row level security;
drop policy if exists "Anyone reads plan entitlements" on public.plan_entitlements;
create policy "Anyone reads plan entitlements"
  on public.plan_entitlements for select to anon, authenticated
  using (true);
-- เขียนได้เฉพาะเซิร์ฟเวอร์ (API ของ Dev ใช้ service role)

-- 3) คำสั่งซื้อรับแพ็กเกจใหม่ได้ (คงค่าเดิมไว้ให้ประวัติเก่า)
alter table public.payment_orders drop constraint if exists payment_orders_plan_check;
alter table public.payment_orders
  add constraint payment_orders_plan_check check (plan in ('day', 'egg', 'kid', 'grown', 'plus', 'pro', 'master'));

-- 4) แพ็กเกจปัจจุบันของบัญชี: dev = master, หมดอายุ/ไม่มี = free, สมาชิกเก่าที่ยังไม่มี plan = plus
create or replace function public.user_tier(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'dev' then 'master'
    when p.username like 'trial\_%' then 'free'
    when p.premium_until is not null and p.premium_until > now() then coalesce(p.plan, 'plus')
    else 'free'
  end
  from public.profiles p where p.id = p_uid;
$$;
revoke all on function public.user_tier(uuid) from public, anon;
grant execute on function public.user_tier(uuid) to service_role;

create or replace function public.can_discover()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select e.discover from public.plan_entitlements e where e.tier = public.user_tier(auth.uid())), false)
     or exists (select 1 from public.profiles where id = auth.uid() and role = 'dev');
$$;
revoke all on function public.can_discover() from public, anon;
grant execute on function public.can_discover() to authenticated;

-- 5) โควต้าชุดคำถาม / สื่อการสอน อ่านจากตารางสิทธิ์
create or replace function public.user_games_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  made integer;
  t text;
  cap integer;
begin
  select count(*) into n from public.user_games where owner_id = new.owner_id;
  select games_created into made from public.profiles where id = new.owner_id for update;
  t := coalesce(public.user_tier(new.owner_id), 'free');
  select sets into cap from public.plan_entitlements where tier = t;
  if not found then cap := case when t = 'free' then 2 else 300 end; end if;

  if t = 'free' then
    if cap is not null and greatest(coalesce(made, 0), n) >= cap then
      raise exception 'free game limit' using errcode = 'P0001';
    end if;
  elsif n >= least(coalesce(cap, 300), 300) then
    raise exception 'game quota exceeded' using errcode = 'P0001';
  end if;

  update public.profiles set games_created = greatest(coalesce(made, 0), n) + 1 where id = new.owner_id;
  return new;
end;
$$;

create or replace function public.user_designs_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  made integer;
  t text;
  cap integer;
begin
  select count(*) into n from public.user_designs where owner_id = new.owner_id;
  select designs_created into made from public.profiles where id = new.owner_id for update;
  t := coalesce(public.user_tier(new.owner_id), 'free');
  select designs into cap from public.plan_entitlements where tier = t;
  if not found then cap := case when t = 'free' then 3 else 500 end; end if;

  if t = 'free' then
    if cap is not null and greatest(coalesce(made, 0), n) >= cap then
      raise exception 'free design limit' using errcode = 'P0001';
    end if;
  elsif n >= least(coalesce(cap, 500), 500) then
    raise exception 'design quota exceeded' using errcode = 'P0001';
  end if;

  update public.profiles set designs_created = greatest(coalesce(made, 0), n) + 1 where id = new.owner_id;
  select username into new.owner_name from public.profiles where id = new.owner_id;
  return new;
end;
$$;

-- 6) Discover ตามสิทธิ์ของแพ็กเกจ
drop policy if exists "Members read public games" on public.user_games;
create policy "Members read public games"
  on public.user_games for select to authenticated
  using (is_public and public.can_discover());

drop policy if exists "Members read public designs" on public.user_designs;
create policy "Members read public designs"
  on public.user_designs for select to authenticated
  using (is_public and public.can_discover());

create or replace function public.design_copied(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_designs
     set copy_count = copy_count + 1
   where id = p_id and is_public and owner_id <> auth.uid() and public.can_discover();
$$;
revoke all on function public.design_copied(uuid) from public, anon;
grant execute on function public.design_copied(uuid) to authenticated;

-- 7) สั่งทำนวัตกรรมตามแผนการสอน (เข้าถึงผ่านเซิร์ฟเวอร์เท่านั้น ไม่มี policy ให้ผู้ใช้ทั่วไป)
create table if not exists public.innovation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  email text not null check (char_length(email) between 3 and 200),
  title text not null check (char_length(title) between 1 and 120),
  subject text not null default '' check (char_length(subject) <= 60),
  grade text not null default '' check (char_length(grade) <= 40),
  details text not null default '' check (char_length(details) <= 4000),
  file_path text,
  file_name text check (file_name is null or char_length(file_name) <= 200),
  file_size bigint,
  status text not null default 'pending' check (status in ('pending', 'working', 'delivered', 'revision', 'cancelled')),
  link text check (link is null or char_length(link) <= 1000),
  dev_note text not null default '' check (char_length(dev_note) <= 2000),
  revisions_used integer not null default 0 check (revisions_used >= 0),
  month_key text not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists idx_innovation_user on public.innovation_requests(user_id, created_at desc);
create index if not exists idx_innovation_status on public.innovation_requests(status, created_at desc);
alter table public.innovation_requests enable row level security;

create table if not exists public.innovation_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.innovation_requests(id) on delete cascade,
  kind text not null check (kind in ('submit', 'revision', 'status', 'deliver')),
  by_dev boolean not null default false,
  message text not null default '' check (char_length(message) <= 4000),
  file_path text,
  file_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_innovation_events_req on public.innovation_events(request_id, created_at);
alter table public.innovation_events enable row level security;

-- ไฟล์แผนการสอน (ส่วนตัว อัปโหลดผ่านลิงก์ชั่วคราวจากเซิร์ฟเวอร์ ดาวน์โหลดได้เฉพาะ Dev ผ่านเซิร์ฟเวอร์)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'innovation', 'innovation', false, 26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
