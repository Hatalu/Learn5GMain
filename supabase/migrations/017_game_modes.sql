-- ==============================================================================
-- 017: รูปแบบการเล่น (ควิซ / Café / Tower Defense / Racing) + Dev ลบชุดคำถามของใครก็ได้
--   * game_rooms.game          รูปแบบการเล่นของห้อง
--   * room_players.progress    ระยะทางในโหมด Racing (เพิ่ม/ลดผ่านฟังก์ชัน room_race_step เท่านั้น กันข้อมูลชนกัน)
--   * room_players.power       ไอเท็มที่ถืออยู่ (Racing)  slip_at = เวลาที่โดนกล้วย
--   * room_players.stats       สถิติของโหมด (เช่น เสิร์ฟกี่จาน ผ่านกี่เวฟ)
--   * room_answers.seq         ลำดับคำตอบ (โหมดเกมคำถามวนซ้ำได้ จึงเลิกใช้ unique (player_id, q_index))
-- ต้องรัน 015 016 ก่อน  รันซ้ำได้ปลอดภัย
-- ==============================================================================

alter table public.game_rooms add column if not exists game text not null default 'quiz';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_rooms_game_check') then
    alter table public.game_rooms add constraint game_rooms_game_check check (game in ('quiz', 'cafe', 'tower', 'racing'));
  end if;
end $$;

alter table public.room_players add column if not exists progress integer not null default 0;
alter table public.room_players add column if not exists power text;
alter table public.room_players add column if not exists slip_at timestamptz;
alter table public.room_players add column if not exists stats jsonb not null default '{}'::jsonb;

alter table public.room_answers add column if not exists seq integer;
update public.room_answers set seq = q_index where seq is null;
alter table public.room_answers alter column seq set not null;
alter table public.room_answers drop constraint if exists room_answers_player_id_q_index_key;
create unique index if not exists uq_room_answers_seq on public.room_answers(player_id, seq);

-- เดินหน้า/ถอยหลังในโหมด Racing แบบ atomic (ไม่ต่ำกว่า 0 ไม่เกินเส้นชัย) และบันทึกเวลาเข้าเส้นชัย
create or replace function public.room_race_step(p_player uuid, p_delta integer, p_goal integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  update public.room_players
  set progress = greatest(0, least(p_goal, progress + p_delta)),
      finished_at = case when finished_at is null and progress + p_delta >= p_goal then now() else finished_at end
  where id = p_player and finished_at is null
  returning progress into v;
  return v;
end;
$$;
revoke all on function public.room_race_step(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.room_race_step(uuid, integer, integer) to service_role;

-- Dev ดู/ลบชุดคำถามของทุกคนได้
drop policy if exists "Devs read all games" on public.user_games;
create policy "Devs read all games"
  on public.user_games for select to authenticated
  using (public.is_dev());

drop policy if exists "Devs delete any game" on public.user_games;
create policy "Devs delete any game"
  on public.user_games for delete to authenticated
  using (public.is_dev());
