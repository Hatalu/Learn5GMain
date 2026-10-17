-- ==============================================================================
-- 019: เปิดสมัครบัญชีเอง + บัญชีที่ไม่ได้เป็นสมาชิกทดลองระบบสร้างเกมได้ + โควต้าไฟล์ต่อบัญชี
--
-- 1) profiles.contact_email  อีเมลที่ผู้สมัครกรอก (ใช้ติดต่อ/ช่วยกู้บัญชี ไม่ใช่อีเมลล็อกอิน)
--                            ห้ามซ้ำกัน (ไม่สนตัวพิมพ์เล็กใหญ่) แก้ไขจากเบราว์เซอร์ไม่ได้ (ไม่มี policy update)
-- 2) user_games              บัญชีจริงที่ไม่ใช่สมาชิก สร้าง/แก้ชุดคำถามของตัวเองได้ แต่มีได้ไม่เกิน 2 ชุด
--                            (สมาชิก/Dev ไม่เกิน 300 ชุดเหมือนเดิม) บัญชีทดลอง trial_* ยังสร้างไม่ได้
-- 3) storage game-media      ปิดการอัปโหลดตรงจากเบราว์เซอร์ ให้อัปโหลดผ่านลิงก์ที่เซิร์ฟเวอร์ออกให้เท่านั้น
--                            (เซิร์ฟเวอร์ตรวจโควต้า MB ต่อบัญชีก่อนออกลิงก์)
-- 4) media_in_use(uid)       รายชื่อไฟล์ของ uid ที่ยังมีเกม/ห้องอ้างถึงอยู่ (ใช้ล้างไฟล์ที่ไม่ได้ใช้เพื่อคืนโควต้า)
--
-- ต้องรัน 006/010/015/016 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

-- 1) อีเมลติดต่อ -------------------------------------------------------------
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles drop constraint if exists profiles_contact_email_len;
alter table public.profiles add constraint profiles_contact_email_len
  check (contact_email is null or char_length(contact_email) <= 254);
create unique index if not exists uq_profiles_contact_email
  on public.profiles (lower(contact_email)) where contact_email is not null;

-- 2) ชุดคำถามของบัญชีที่ไม่ใช่สมาชิก ---------------------------------------------
create or replace function public.is_real_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and username not like 'trial\_%'
  );
$$;
revoke all on function public.is_real_user() from public, anon;
grant execute on function public.is_real_user() to authenticated;

create or replace function public.user_games_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  paid boolean;
begin
  select count(*) into n from public.user_games where owner_id = new.owner_id;
  select exists (
    select 1 from public.profiles
    where id = new.owner_id
      and username not like 'trial\_%'
      and (role = 'dev' or (premium_until is not null and premium_until > now()))
  ) into paid;
  if paid then
    if n >= 300 then
      raise exception 'game quota exceeded' using errcode = 'P0001';
    end if;
  elsif n >= 2 then
    raise exception 'free game limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists user_games_quota on public.user_games;
create trigger user_games_quota
  before insert on public.user_games
  for each row execute function public.user_games_quota();

drop policy if exists "Members insert own games" on public.user_games;
drop policy if exists "Users insert own games" on public.user_games;
create policy "Users insert own games"
  on public.user_games for insert to authenticated
  with check (owner_id = auth.uid() and public.is_real_user());

drop policy if exists "Members update own games" on public.user_games;
drop policy if exists "Users update own games" on public.user_games;
create policy "Users update own games"
  on public.user_games for update to authenticated
  using (owner_id = auth.uid() and public.is_real_user())
  with check (owner_id = auth.uid() and public.is_real_user());

-- 3) อัปโหลดไฟล์ผ่านเซิร์ฟเวอร์เท่านั้น ---------------------------------------------
drop policy if exists "Members upload own game media" on storage.objects;

-- 4) ไฟล์ที่ยังถูกอ้างถึง -------------------------------------------------------
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
  ) x;
$$;
revoke all on function public.media_in_use(uuid) from public, anon, authenticated;
grant execute on function public.media_in_use(uuid) to service_role;
