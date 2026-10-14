-- ==============================================================================
-- 012: บันทึกจำนวนครั้งที่กด "ทดลองเล่น" (นับรวมคนที่ยังไม่ได้สมัคร)
-- เขียน/อ่านผ่านเซิร์ฟเวอร์ (service role) เท่านั้น ไม่เปิดสิทธิ์ให้ผู้ใช้ทั่วไป  รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.trial_plays (
  id bigint generated always as identity primary key,
  media_id uuid references public.media(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trial_plays_created on public.trial_plays(created_at desc);

alter table public.trial_plays enable row level security;
revoke all on public.trial_plays from anon, authenticated;
