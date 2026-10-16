-- ==============================================================================
-- 016: Discover (เกมที่ครูเปิด Public ให้สมาชิกคนอื่นค้นหา เปิดห้องเล่น และทำสำเนาได้)
--   * user_games.is_public  ค่าเริ่มต้น true (เจ้าของสลับ Private/Public ได้)
--   * user_games.owner_name ชื่อเจ้าของเกม (เก็บซ้ำเพราะสมาชิกอ่านโปรไฟล์คนอื่นไม่ได้) ตั้งอัตโนมัติด้วย trigger
--   * policy: สมาชิกที่สิทธิ์ยังไม่หมดอายุ อ่านเกม Public ของทุกคนได้ (เกม Private อ่านได้เฉพาะเจ้าของ)
-- ต้องรัน 015 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.user_games add column if not exists is_public boolean not null default true;
alter table public.user_games add column if not exists owner_name text;

-- เติมชื่อเจ้าของให้เกมที่มีอยู่แล้ว
update public.user_games g
set owner_name = p.username
from public.profiles p
where p.id = g.owner_id and g.owner_name is null;

-- ตั้งชื่อเจ้าของตอนสร้างเกม (ผู้ใช้กำหนดเองไม่ได้)
create or replace function public.user_games_owner_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select username into new.owner_name from public.profiles where id = new.owner_id;
  return new;
end;
$$;
drop trigger if exists user_games_owner_name on public.user_games;
create trigger user_games_owner_name
  before insert on public.user_games
  for each row execute function public.user_games_owner_name();

-- ห้ามแก้ owner_name จากเบราว์เซอร์
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
      new.owner_name := old.owner_name;
    end if;
  end if;
  return new;
end;
$$;

create index if not exists idx_user_games_public on public.user_games(updated_at desc) where is_public;

drop policy if exists "Members read public games" on public.user_games;
create policy "Members read public games"
  on public.user_games for select to authenticated
  using (is_public and public.is_premium_active());
