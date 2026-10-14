-- ==============================================================================
-- 010: บัญชีทดลองเล่น (trial_*) ไม่นับเป็นสมาชิกในฐานข้อมูล
-- บัญชีทดลองมีอายุ 2 นาที ใช้แค่ในเกม จึงไม่ควรเขียนข้อมูลที่ต้องเป็นสมาชิกได้
-- (เช่น ส่งไอเดีย / บันทึกข้อมูลปุ๋ง) กันคนสร้างบัญชีทดลองซ้ำๆ เพื่อสแปม
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

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
      and username not like 'trial\_%'
      and (role = 'dev' or (premium_until is not null and premium_until > now()))
  );
$$;

revoke all on function public.is_premium_active() from public, anon;
grant execute on function public.is_premium_active() to authenticated;
