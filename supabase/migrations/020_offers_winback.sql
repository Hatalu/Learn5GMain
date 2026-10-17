-- ==============================================================================
-- 020: แพลนรายวัน + ส่วนลดบัญชีใหม่ + โบนัสต่ออายุ + อีเมลชวนกลับ
--   * payment_orders.plan รับ 'day' (1 วัน 19 บาท)
--   * payment_orders.promo      ข้อเสนอที่ใช้กับคำสั่งซื้อนี้ ('welcome' = ลดบัญชีใหม่, 'renew' = โบนัสต่ออายุ)
--   * payment_orders.list_amount ราคาปกติของแพลนตอนสั่งซื้อ (amount คือยอดที่ต้องจ่ายจริง)
--   * payment_orders.bonus_days  วันแถมที่ได้เพิ่มจากแพลน
--   * payment_orders.email       อีเมลที่ผู้สมัครใหม่กรอกตอนจ่ายเงิน (ไม่บังคับ)
--   * profiles.email_opt_out     ผู้ใช้กดยกเลิกรับอีเมลแล้ว
--   * profiles.winback_for       ส่งอีเมลชวนกลับไปแล้วสำหรับวันหมดอายุนี้ (กันส่งซ้ำ)
-- ทุกคอลัมน์แก้ได้จากเซิร์ฟเวอร์ (service role) เท่านั้น ผู้ใช้แก้ profiles เองไม่ได้อยู่แล้ว
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.payment_orders drop constraint if exists payment_orders_plan_check;
alter table public.payment_orders
  add constraint payment_orders_plan_check check (plan in ('day', 'egg', 'kid', 'grown'));

alter table public.payment_orders add column if not exists promo text;
alter table public.payment_orders drop constraint if exists payment_orders_promo_check;
alter table public.payment_orders
  add constraint payment_orders_promo_check check (promo is null or promo in ('welcome', 'renew'));

alter table public.payment_orders add column if not exists list_amount numeric(10, 2);
alter table public.payment_orders add column if not exists bonus_days int not null default 0;
alter table public.payment_orders drop constraint if exists payment_orders_bonus_days_check;
alter table public.payment_orders
  add constraint payment_orders_bonus_days_check check (bonus_days between 0 and 30);

alter table public.payment_orders add column if not exists email text;

create index if not exists idx_payment_orders_user_paid
  on public.payment_orders(user_id) where status = 'paid';

alter table public.profiles add column if not exists email_opt_out boolean not null default false;
alter table public.profiles add column if not exists winback_for timestamptz;

create index if not exists idx_profiles_premium_until on public.profiles(premium_until);
