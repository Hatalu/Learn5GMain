-- ==============================================================================
-- 023: ระบบสร้างสื่อการสอน (Studio) ครูออกแบบใบงาน/ใบความรู้/ป้ายเองบนหน้ากระดาษ แล้วโหลดเป็นรูปหรือ PDF
--
-- user_designs  สื่อที่ครูสร้าง (เจ้าของอ่าน/เขียนเอง) ไม่เกี่ยวกับตาราง media จึงไม่ขึ้นในหน้าหลัก
--   * บัญชีฟรี (ไม่ใช่สมาชิก) สร้างได้ 1 สื่อ "ตลอดอายุบัญชี" ลบแล้วไม่คืนสิทธิ์ (profiles.designs_created)
--   * สมาชิก/Dev สร้างได้ไม่จำกัด (มีเพดานกันสแปม 500 สื่อที่มีอยู่ในคลังพร้อมกัน)
--   * Discover: เจ้าของตั้ง Public/Private ได้ สมาชิกอ่านสื่อ Public ของทุกคนได้ (เหมือนชุดคำถาม migration 016)
--   * Dev อ่าน/ลบได้ทุกสื่อ
-- user_characters ตัวละครแต่งเองของแต่ละคน (เจ้าของเห็นคนเดียว)
-- media_in_use  นับรูปที่สื่อเหล่านี้ใช้ด้วย (ไม่งั้นตัวล้างไฟล์ที่ไม่ใช้จะลบรูปในสื่อทิ้ง)
--
-- ต้องรัน 001 015 016 019 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.profiles add column if not exists designs_created integer not null default 0;

create table if not exists public.user_designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_name text,
  title text not null check (char_length(title) between 1 and 80),
  content jsonb not null default '{}'::jsonb check (octet_length(content::text) <= 900000),
  thumb text check (thumb is null or (char_length(thumb) <= 60000 and thumb like 'data:image/jpeg;base64,%')),
  page_count integer not null default 1 check (page_count between 1 and 30),
  is_public boolean not null default true,
  copy_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_designs_owner on public.user_designs(owner_id, updated_at desc);
create index if not exists idx_user_designs_public on public.user_designs(updated_at desc) where is_public;

drop trigger if exists set_user_designs_updated_at on public.user_designs;
create trigger set_user_designs_updated_at
  before update on public.user_designs
  for each row execute function public.handle_updated_at();

-- โควต้า: บัญชีฟรี 1 สื่อตลอดอายุบัญชี / สมาชิก 500 สื่อในคลัง
create or replace function public.user_designs_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  made integer;
  paid boolean;
begin
  select count(*) into n from public.user_designs where owner_id = new.owner_id;
  select designs_created into made from public.profiles where id = new.owner_id for update;
  select exists (
    select 1 from public.profiles
    where id = new.owner_id
      and username not like 'trial\_%'
      and (role = 'dev' or (premium_until is not null and premium_until > now()))
  ) into paid;

  if paid then
    if n >= 500 then
      raise exception 'design quota exceeded' using errcode = 'P0001';
    end if;
  elsif greatest(coalesce(made, 0), n) >= 1 then
    raise exception 'free design limit' using errcode = 'P0001';
  end if;

  update public.profiles set designs_created = greatest(coalesce(made, 0), n) + 1 where id = new.owner_id;
  select username into new.owner_name from public.profiles where id = new.owner_id;
  return new;
end;
$$;
drop trigger if exists user_designs_quota on public.user_designs;
create trigger user_designs_quota
  before insert on public.user_designs
  for each row execute function public.user_designs_quota();

-- เบราว์เซอร์แก้เจ้าของ/ชื่อเจ้าของ/ยอดทำสำเนาไม่ได้
create or replace function public.user_designs_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.copy_count := 0;
    else
      new.owner_id := old.owner_id;
      new.owner_name := old.owner_name;
      new.copy_count := old.copy_count;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists user_designs_guard on public.user_designs;
create trigger user_designs_guard
  before insert or update on public.user_designs
  for each row execute function public.user_designs_guard();

alter table public.user_designs enable row level security;

drop policy if exists "Owners read own designs" on public.user_designs;
create policy "Owners read own designs"
  on public.user_designs for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Members read public designs" on public.user_designs;
create policy "Members read public designs"
  on public.user_designs for select to authenticated
  using (is_public and public.is_premium_active());

drop policy if exists "Devs read all designs" on public.user_designs;
create policy "Devs read all designs"
  on public.user_designs for select to authenticated
  using (public.is_dev());

drop policy if exists "Users insert own designs" on public.user_designs;
create policy "Users insert own designs"
  on public.user_designs for insert to authenticated
  with check (owner_id = auth.uid() and public.is_real_user());

drop policy if exists "Users update own designs" on public.user_designs;
create policy "Users update own designs"
  on public.user_designs for update to authenticated
  using (owner_id = auth.uid() and public.is_real_user())
  with check (owner_id = auth.uid() and public.is_real_user());

drop policy if exists "Owners delete own designs" on public.user_designs;
create policy "Owners delete own designs"
  on public.user_designs for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Devs delete any design" on public.user_designs;
create policy "Devs delete any design"
  on public.user_designs for delete to authenticated
  using (public.is_dev());

-- นับยอดทำสำเนา (ใช้เรียง "ยอดนิยม" ใน Discover) สมาชิกนับให้สื่อ Public ของคนอื่นได้เท่านั้น
create or replace function public.design_copied(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_designs
     set copy_count = copy_count + 1
   where id = p_id and is_public and owner_id <> auth.uid() and public.is_premium_active();
$$;
revoke all on function public.design_copied(uuid) from public, anon;
grant execute on function public.design_copied(uuid) to authenticated;

-- ตัวละครแต่งเองของฉัน (เก็บเฉพาะค่าการแต่งตัว เจ้าของเห็นคนเดียว คนละไม่เกิน 60 ตัว)
create table if not exists public.user_characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  look jsonb not null check (octet_length(look::text) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists idx_user_characters_owner on public.user_characters(owner_id, created_at desc);

create or replace function public.user_characters_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.user_characters where owner_id = new.owner_id) >= 60 then
    raise exception 'character quota exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists user_characters_quota on public.user_characters;
create trigger user_characters_quota
  before insert on public.user_characters
  for each row execute function public.user_characters_quota();

alter table public.user_characters enable row level security;
drop policy if exists "Owners read own characters" on public.user_characters;
create policy "Owners read own characters"
  on public.user_characters for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists "Users insert own characters" on public.user_characters;
create policy "Users insert own characters"
  on public.user_characters for insert to authenticated
  with check (owner_id = auth.uid() and public.is_real_user());
drop policy if exists "Owners delete own characters" on public.user_characters;
create policy "Owners delete own characters"
  on public.user_characters for delete to authenticated
  using (owner_id = auth.uid());

-- ไฟล์ที่ยังถูกอ้างถึง: เพิ่มสื่อของ Studio (ของเดิมจาก 019 + user_designs)
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
  ) x;
$$;
revoke all on function public.media_in_use(uuid) from public, anon, authenticated;
grant execute on function public.media_in_use(uuid) to service_role;
