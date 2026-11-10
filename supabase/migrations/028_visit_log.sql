-- ==============================================================================
-- 028: บันทึกการเข้าเว็บแบบรายการ (หน้า Dev > ใครเข้าเว็บบ้าง)
-- เพิ่มชนิดเครื่อง (มือถือ/แท็บเล็ต/คอม + เบราว์เซอร์) และหน้าแรกที่เข้า ยังไม่เก็บ IP หรือ user-agent เต็ม
-- ก่อนรันไฟล์นี้ ระบบยังบันทึกได้ (แค่ไม่มี 2 คอลัมน์นี้)  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.site_visits add column if not exists device text;
alter table public.site_visits add column if not exists path text;

create index if not exists idx_site_visits_user on public.site_visits(user_id, created_at desc);
