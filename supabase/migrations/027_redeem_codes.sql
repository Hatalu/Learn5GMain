-- ==============================================================================
-- 027: โค้ดรับสมาชิกฟรี (Dev สร้างโค้ด 10 หลัก กำหนดจำนวนวัน ผู้ใช้กรอกที่หน้าหลัก)
--   * อ่าน/เขียนผ่าน service role เท่านั้น (เปิด RLS ไม่มี policy)
--   * ใช้ได้ครั้งเดียว: used_by ว่าง = ยังไม่มีใครใช้
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.redeem_codes (
  code text primary key check (code ~ '^[A-Z2-9]{10}$'),
  days int not null check (days between 1 and 3650),
  created_at timestamptz not null default now(),
  used_by uuid references public.profiles(id) on delete set null,
  used_username text,
  used_at timestamptz
);

create index if not exists redeem_codes_created_idx on public.redeem_codes (created_at desc);

alter table public.redeem_codes enable row level security;
