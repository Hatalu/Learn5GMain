-- ==============================================================================
-- 009: ระบบสมัครสมาชิก (จ่ายผ่าน QR พร้อมเพย์ + ตรวจสลิปด้วย EasySlip)
-- ทั้งสองตารางไม่มี policy ให้ผู้ใช้ทั่วไปเลย: อ่าน/เขียนผ่านเซิร์ฟเวอร์ (service role) เท่านั้น
-- Dev จัดการผ่านหน้า Dev > การชำระเงิน (API ตรวจสิทธิ์ Dev ก่อนทุกครั้ง)
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.payment_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  promptpay_id text,                -- เบอร์มือถือ / เลขบัตรประชาชน / e-Wallet ID ที่ผูกพร้อมเพย์
  account_name text,                -- ชื่อบัญชีผู้รับ (แสดงให้ผู้โอนเห็น + ใช้เทียบกับสลิป)
  bank_name text,
  bank_account text,                -- เลขบัญชีธนาคาร (ใช้เทียบกับเลขบัญชีผู้รับในสลิป)
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  username text,                    -- ชื่อบัญชีที่ได้สิทธิ์ (เติมเมื่อชำระสำเร็จ)
  plan text not null check (plan in ('egg', 'kid', 'grown')),
  days int not null check (days > 0),
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  trans_ref text unique,            -- เลขอ้างอิงธุรกรรมจากสลิป (กันใช้สลิปซ้ำ)
  slip_amount numeric(10, 2),
  slip_date timestamptz,
  sender_name text,
  attempts int not null default 0,
  last_error text,
  ip text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  premium_until timestamptz
);

create index if not exists idx_payment_orders_created on public.payment_orders(created_at desc);
create index if not exists idx_payment_orders_status on public.payment_orders(status);

alter table public.payment_settings enable row level security;
alter table public.payment_orders enable row level security;

-- ไม่สร้าง policy ใดๆ = ผู้ใช้ทั่วไป (anon/authenticated) อ่านเขียนไม่ได้เลย
revoke all on public.payment_settings from anon, authenticated;
revoke all on public.payment_orders from anon, authenticated;
