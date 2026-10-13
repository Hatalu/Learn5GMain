-- ==============================================================================
-- 006: บันทึกข้อมูลปุ๋ง (คู่หู) + สติกเกอร์ ขึ้น Supabase ผูกกับบัญชี
-- สิทธิ์: เฉพาะสมาชิก Premium ที่ยังไม่หมดอายุ (และ Dev) เขียนได้
--         ผู้ที่ Premium หมดอายุอ่าน/ลบข้อมูลของตัวเองได้ แต่เขียนเพิ่มไม่ได้ (ต่ออายุแล้วกลับมาใช้ต่อ)
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

-- ตรวจสิทธิ์ Premium ฝั่งฐานข้อมูล (ซ่อนปุ่มในหน้าเว็บอย่างเดียวไม่พอ)
create or replace function public.is_premium_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'dev' or (premium_until is not null and premium_until > now()))
  );
$$;

revoke all on function public.is_premium_active() from public, anon;
grant execute on function public.is_premium_active() to authenticated;

create table if not exists public.companion_data (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- กันข้อมูลผิดรูปและกันเก็บของใหญ่เกินจริง
  constraint companion_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint companion_data_size check (pg_column_size(data) < 60000)
);

alter table public.companion_data enable row level security;

drop policy if exists "Own companion data readable" on public.companion_data;
create policy "Own companion data readable"
  on public.companion_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Premium can insert own companion data" on public.companion_data;
create policy "Premium can insert own companion data"
  on public.companion_data for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_premium_active());

drop policy if exists "Premium can update own companion data" on public.companion_data;
create policy "Premium can update own companion data"
  on public.companion_data for update
  to authenticated
  using (auth.uid() = user_id and public.is_premium_active())
  with check (auth.uid() = user_id and public.is_premium_active());

drop policy if exists "Own companion data deletable" on public.companion_data;
create policy "Own companion data deletable"
  on public.companion_data for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.companion_data from anon;
grant select, insert, update, delete on public.companion_data to authenticated;

notify pgrst, 'reload schema';
