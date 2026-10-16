-- ==============================================================================
-- 018: รูปแบบการเล่นใหม่ (Monster Brawl / Fishing Frenzy) + เครื่องประดับตัวละครผู้เล่น
--   * game_rooms.game     เพิ่มค่า 'brawl', 'fishing'
--   * room_players.gear   เครื่องประดับ { h: หมวก, o: ชุด, m: หน้ากาก, i: ของถือ } (เลขลำดับ 0 = ไม่ใส่)
--   * "เฉลยเมื่อตอบผิด" เก็บใน game_rooms.settings (jsonb เดิม) ไม่ต้องเพิ่มคอลัมน์
-- ต้องรัน 015 016 017 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.game_rooms drop constraint if exists game_rooms_game_check;
alter table public.game_rooms add constraint game_rooms_game_check check (game in ('quiz', 'cafe', 'tower', 'racing', 'brawl', 'fishing'));

alter table public.room_players add column if not exists gear jsonb not null default '{}'::jsonb;
