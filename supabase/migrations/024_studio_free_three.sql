-- 024: บัญชีฟรีสร้างสื่อการสอน (Studio) ได้ 3 สื่อตลอดอายุบัญชี (เดิม 1) สมาชิกเหมือนเดิม
-- + ตาราง user_characters (ตัวละครของฉัน) เผื่อฐานข้อมูลรัน 023 รุ่นแรกที่ยังไม่มีตารางนี้
-- รันซ้ำได้ ไม่ลบข้อมูล ตัวเลข 3 ต้องตรงกับ FREE_DESIGN_LIMIT ใน src/lib/game-creator/quota.ts

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
  elsif greatest(coalesce(made, 0), n) >= 3 then
    raise exception 'free design limit' using errcode = 'P0001';
  end if;

  update public.profiles set designs_created = greatest(coalesce(made, 0), n) + 1 where id = new.owner_id;
  select username into new.owner_name from public.profiles where id = new.owner_id;
  return new;
end;
$$;

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
