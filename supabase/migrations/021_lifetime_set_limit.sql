-- ==============================================================================
-- 021: บัญชีฟรีสร้างชุดคำถามได้ 2 ชุด "ตลอดอายุบัญชี" (ลบชุดเดิมแล้วไม่คืนสิทธิ์)
--   * profiles.games_created  จำนวนชุดคำถามที่บัญชีนี้เคยสร้างทั้งหมด (นับเพิ่มทุกครั้งที่สร้าง/ทำสำเนา ไม่ลดเมื่อลบ)
--   * trigger user_games_quota: บัญชีที่ไม่ใช่สมาชิก เคยสร้างครบ 2 ชุดแล้ว = สร้างเพิ่มไม่ได้ ('free game limit')
--     สมาชิกยังใช้เพดาน 300 ชุดที่มีอยู่ในคลังตอนนั้น
--   * ผู้ใช้แก้ games_created เองไม่ได้ (ตาราง profiles ไม่มี policy update ให้ผู้ใช้ทั่วไป)
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.profiles add column if not exists games_created integer not null default 0;

-- นับย้อนหลังจากชุดที่มีอยู่ตอนนี้ (ชุดที่เคยลบไปก่อนรันไฟล์นี้ย้อนนับไม่ได้)
update public.profiles p
   set games_created = c.n
  from (select owner_id, count(*)::integer as n from public.user_games group by owner_id) c
 where c.owner_id = p.id
   and p.games_created < c.n;

create or replace function public.user_games_quota()
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
  select count(*) into n from public.user_games where owner_id = new.owner_id;
  select games_created into made from public.profiles where id = new.owner_id for update;
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
  elsif greatest(coalesce(made, 0), n) >= 2 then
    raise exception 'free game limit' using errcode = 'P0001';
  end if;

  update public.profiles set games_created = greatest(coalesce(made, 0), n) + 1 where id = new.owner_id;
  return new;
end;
$$;
drop trigger if exists user_games_quota on public.user_games;
create trigger user_games_quota
  before insert on public.user_games
  for each row execute function public.user_games_quota();
