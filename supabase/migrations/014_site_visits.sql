-- ==============================================================================
-- 014: สถิติการเข้าเว็บไซต์ (ผู้ใช้ที่มีบัญชีและไม่มีบัญชี)
-- เก็บ "1 IP ต่อ 30 นาที" เท่านั้น (ตัวกันซ้ำอยู่ที่ rate_limits ผ่านฟังก์ชัน rl_hit จาก 013) กันปั่นยอด
-- ไม่เก็บ IP ในตารางนี้เลย เก็บเฉพาะเวลา และ user_id (ถ้าล็อกอินอยู่)
-- เขียน/อ่านผ่านเซิร์ฟเวอร์ (service role) เท่านั้น  รันซ้ำได้ปลอดภัย (ต้องรัน 013 ก่อนเพื่อให้กันซ้ำได้ทุกเครื่อง)
-- ==============================================================================

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null
);

create index if not exists idx_site_visits_created on public.site_visits(created_at desc);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

-- สรุปรายวัน (เวลาไทย) แยกผู้เยี่ยมชม/สมาชิก
create or replace function public.visit_daily(p_days int)
returns table(day date, guests bigint, members bigint)
language sql
stable
security definer
set search_path = public
as $$
  select (created_at at time zone 'Asia/Bangkok')::date as day,
         count(*) filter (where user_id is null) as guests,
         count(*) filter (where user_id is not null) as members
  from public.site_visits
  where created_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1;
$$;

revoke all on function public.visit_daily(int) from public, anon, authenticated;
grant execute on function public.visit_daily(int) to service_role;
