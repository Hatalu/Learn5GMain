-- ==============================================================================
-- 026: รูปแบบการเล่นใหม่ "ขโมยไข่บอสหลับ" (egg) โลก 3 มิติ 10 ไบโอม
--   * game_rooms.game เพิ่มค่า 'egg'
--   * จำนวนทีม เก็บใน game_rooms.settings.teams (jsonb เดิม)
-- ต้องรัน 025 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.game_rooms drop constraint if exists game_rooms_game_check;
alter table public.game_rooms add constraint game_rooms_game_check
  check (game in ('quiz', 'cafe', 'tower', 'racing', 'brawl', 'fishing', 'turf', 'treasure', 'egg'));
