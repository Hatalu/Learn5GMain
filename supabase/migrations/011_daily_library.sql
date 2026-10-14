-- ==============================================================================
-- 011: คลังเกมประจำวัน (แยกจากสื่อปกติ)
-- media.is_daily = true  -> เป็นเกมในคลังเกมประจำวัน: ไม่ขึ้นในคลังสื่อหน้าหลัก ไม่นับในตัวกรอง/สติกเกอร์
--                           ใช้ได้เฉพาะวันที่ Dev ตั้งไว้ในตาราง daily_games (1 วัน = 1 เกม, day unique)
-- รันซ้ำได้ปลอดภัย (ต้องรัน 005 ก่อน)
-- ==============================================================================

alter table public.media add column if not exists is_daily boolean not null default false;

create index if not exists idx_media_is_daily on public.media(is_daily) where is_daily;
