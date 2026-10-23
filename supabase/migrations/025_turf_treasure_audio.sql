-- ==============================================================================
-- 025: รูปแบบการเล่นใหม่ ศึกยึดอาณาจักร (turf) + เกาะมหาสมบัติโจรสลัด (treasure)
--      และคลิปเสียงในโจทย์
--   * game_rooms.game     เพิ่มค่า 'turf', 'treasure'
--   * จำนวนทีม เก็บใน game_rooms.settings.teams (jsonb เดิม) ไม่ต้องเพิ่มคอลัมน์
--   * bucket game-media   อนุญาตไฟล์เสียง (mp3 m4a aac ogg wav webm)
--   * คำถามแบบพิมพ์คำตอบ / คลิป 30 วินาที เก็บใน user_games.content (jsonb เดิม)
-- ต้องรัน 015-018 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.game_rooms drop constraint if exists game_rooms_game_check;
alter table public.game_rooms add constraint game_rooms_game_check
  check (game in ('quiz', 'cafe', 'tower', 'racing', 'brawl', 'fishing', 'turf', 'treasure'));

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'
]
where id = 'game-media';
