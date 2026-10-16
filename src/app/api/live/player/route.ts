import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, rateLimit } from '@/lib/server/rate-limit';
import { checkAnswer, correctIds, isTimeout, scoreFor } from '@/lib/game-creator/quiz';
import { modeById, scoreCap } from '@/lib/game-creator/modes';
import {
  PLAYER_COLS,
  type PlayerRow,
  type RoomRow,
  admin,
  authPlayer,
  broadcast,
  cleanStats,
  endRoom,
  isTimeUp,
  loadRoom,
  playerState,
  questionAt,
  rankOf,
} from '@/lib/server/live';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Racing: ถูกติดกันกี่ข้อถึงได้ไอเท็ม */
const POWER_EVERY = 3;

async function raceStep(db: SupabaseClient, playerId: string, delta: number, goal: number): Promise<number | null> {
  const { data, error } = await db.rpc('room_race_step', { p_player: playerId, p_delta: delta, p_goal: goal });
  if (error) return null;
  return typeof data === 'number' ? data : null;
}

/** Racing: ทุกคนเข้าเส้นชัยแล้ว = จบเกมอัตโนมัติ */
async function maybeFinishRace(db: SupabaseClient, room: RoomRow) {
  const { data } = await db.from('room_players').select('finished_at').eq('room_id', room.id).eq('kicked', false);
  const rows = (data || []) as { finished_at: string | null }[];
  if (rows.length && rows.every((r) => r.finished_at)) await endRoom(db, room);
}

/**
 * คำขอของผู้เล่น (ใช้โทเคนที่ได้ตอนเข้าห้อง)
 * op: 'state'  ดูสถานะ/รับคำถามข้อปัจจุบัน
 *     'peek'   ดูแค่สถานะห้อง (ไม่เริ่มจับเวลาข้อถัดไป)
 *     'answer' ส่งคำตอบ { pos, picks } ตรวจและคิดคะแนนที่เซิร์ฟเวอร์
 *     'sync'   (Café/Tower) ส่งคะแนนจากตัวเกม เซิร์ฟเวอร์จำกัดเพดานตามจำนวนข้อที่ตอบถูก
 *     'power'  (Racing) ใช้ไอเท็มที่ถืออยู่
 *     'leave'  ออกจากห้อง (ระหว่างรอเริ่มจะลบชื่อออก)
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  const db = admin();
  const p = await authPlayer(db, body.playerId, body.token);
  if (!p) return NextResponse.json({ error: 'ไม่พบผู้เล่น', gone: true }, { status: 401 });
  if (!rateLimit(`player:${p.id}`, 150, 60 * 1000)) return NextResponse.json({ error: 'ช้าลงหน่อยนะ' }, { status: 429 });
  if (p.kicked) return NextResponse.json({ error: 'คุณถูกเชิญออกจากห้อง', kicked: true }, { status: 403 });

  const room = await loadRoom(db, p.room_id);
  if (!room) return NextResponse.json({ error: 'ไม่พบห้องนี้', gone: true }, { status: 404 });

  const op = String(body.op || 'state');
  const mode = modeById(room.game);

  if (op === 'peek') {
    return NextResponse.json({ status: room.status, background: room.background, round: room.round, serverNow: Date.now(), progress: p.progress || 0, slipAt: p.slip_at });
  }

  if (op === 'leave') {
    if (room.status === 'lobby' && !p.is_host) {
      await db.from('room_players').delete().eq('id', p.id);
      await broadcast(room.id, 'join', {});
    }
    return NextResponse.json({ ok: true });
  }

  /* ---------- Café / Tower: ส่งคะแนนจากเกม ---------- */
  if (op === 'sync') {
    if (room.game !== 'cafe' && room.game !== 'tower') return NextResponse.json({ error: 'โหมดนี้ไม่ใช้' }, { status: 400 });
    if (room.status !== 'playing' || isTimeUp(room, 15)) return NextResponse.json({ ok: true, status: room.status, score: p.score });
    const want = Math.max(0, Math.round(Number(body.score) || 0));
    const score = Math.max(p.score, Math.min(want, scoreCap(room.game, p.correct)));
    await db.from('room_players').update({ score, stats: cleanStats(body.stats), last_seen_at: new Date().toISOString() }).eq('id', p.id);
    return NextResponse.json({ ok: true, status: room.status, score });
  }

  /* ---------- Racing: ใช้ไอเท็ม ---------- */
  if (op === 'power') {
    if (room.game !== 'racing' || room.status !== 'playing' || p.finished_at || !p.power) return NextResponse.json({ ok: false });
    const power = p.power;
    // ใช้ได้ครั้งเดียว: ล้างไอเท็มแบบมีเงื่อนไขกันกดซ้ำ
    const { data: took } = await db.from('room_players').update({ power: null }).eq('id', p.id).eq('power', power).select('id');
    if (!took || !took.length) return NextResponse.json({ ok: false });
    const goal = room.settings.goal || 15;
    if (power === 'boost') {
      const progress = await raceStep(db, p.id, 2, goal);
      await broadcast(room.id, 'race', {});
      if (progress !== null && progress >= goal) await maybeFinishRace(db, room);
      return NextResponse.json({ ok: true, power, progress });
    }
    // กล้วย: คนที่อยู่ข้างหน้าเราใกล้ที่สุด (ยังไม่เข้าเส้นชัย) ถอยหลัง 1 ก้าว
    const { data: rows } = await db
      .from('room_players')
      .select('id, nickname, progress')
      .eq('room_id', room.id)
      .eq('kicked', false)
      .is('finished_at', null)
      .gt('progress', p.progress || 0)
      .order('progress', { ascending: true })
      .limit(1);
    const target = (rows || [])[0] as { id: string; nickname: string; progress: number } | undefined;
    if (!target) {
      await db.from('room_players').update({ power }).eq('id', p.id); // ไม่มีใครข้างหน้า เก็บไอเท็มไว้ก่อน
      return NextResponse.json({ ok: false, reason: 'ahead' });
    }
    await raceStep(db, target.id, -1, goal);
    await db.from('room_players').update({ slip_at: new Date().toISOString() }).eq('id', target.id);
    await broadcast(room.id, 'banana', { to: target.id, from: p.nickname });
    return NextResponse.json({ ok: true, power, target: target.nickname });
  }

  /* ---------- ส่งคำตอบ ---------- */
  if (op === 'answer') {
    const pos = Number(body.pos);
    const picks = Array.isArray(body.picks) ? body.picks.filter((x): x is string => typeof x === 'string').slice(0, 6) : [];
    const doneQuiz = room.game === 'quiz' && !!p.finished_at;
    const doneRace = room.game === 'racing' && !!p.finished_at;
    if (room.status !== 'playing' || doneQuiz || doneRace || pos !== p.q_pos || isTimeUp(room, 2)) {
      return NextResponse.json({ stale: true, state: await playerState(db, room, p) });
    }
    const at = questionAt(room, p, p.q_pos);
    if (!at) return NextResponse.json({ stale: true, state: await playerState(db, room, p) });
    const { q, index } = at;

    const startedAt = p.q_started_at ? new Date(p.q_started_at).getTime() : Date.now();
    const elapsed = Math.max(0, Date.now() - startedAt);
    const timeout = !mode.endless && isTimeout(q, elapsed);
    const correct = !timeout && checkAnswer(q, picks);
    const points = room.game === 'quiz' ? scoreFor(q, correct, elapsed, p.streak) : 0;

    const { error: insErr } = await db
      .from('room_answers')
      .insert({ room_id: room.id, player_id: p.id, q_index: index, seq: p.q_pos, picks, correct, points, ms: Math.min(elapsed, 2147483647) });
    if (insErr) {
      // ตอบข้อนี้ไปแล้ว (กดซ้ำ/เน็ตส่งซ้ำ)
      const { data: fresh } = await db.from('room_players').select(PLAYER_COLS).eq('id', p.id).maybeSingle();
      return NextResponse.json({ stale: true, state: await playerState(db, room, (fresh as PlayerRow) || p) });
    }

    const total = room.content.questions.length;
    const streak = correct ? p.streak + 1 : 0;
    const next = p.q_pos + 1;
    const now = new Date().toISOString();
    const quizDone = room.game === 'quiz' && next >= total;
    const patch: Record<string, unknown> = {
      score: p.score + points,
      correct: p.correct + (correct ? 1 : 0),
      answered: p.answered + 1,
      streak,
      best_streak: Math.max(p.best_streak, streak),
      last_correct: correct,
      q_pos: next,
      q_started_at: null,
      last_seen_at: now,
    };
    if (room.game === 'quiz') patch.finished_at = quizDone ? now : null;
    let gotPower: string | null = null;
    if (room.game === 'racing' && correct && !p.power && streak % POWER_EVERY === 0) {
      gotPower = Math.random() < 0.5 ? 'boost' : 'banana';
      patch.power = gotPower;
    }
    const { data: upd } = await db.from('room_players').update(patch).eq('id', p.id).eq('q_pos', p.q_pos).select(PLAYER_COLS).maybeSingle();
    let me = (upd as PlayerRow) || p;

    let progress = me.progress || 0;
    let finished = quizDone;
    if (room.game === 'racing') {
      if (correct) {
        const goal = room.settings.goal || 15;
        const np = await raceStep(db, p.id, 1, goal);
        if (np !== null) progress = np;
        finished = progress >= goal;
        // ใช้ progress เป็นคะแนนบนกระดาน
        await db.from('room_players').update({ score: progress }).eq('id', p.id);
        me = { ...me, progress, score: progress, finished_at: finished ? me.finished_at || now : me.finished_at };
        if (finished) await maybeFinishRace(db, room);
      }
      await broadcast(room.id, 'race', {});
    }

    const { rank, players, rivals } = await rankOf(db, room, me);
    return NextResponse.json({
      result: {
        correct,
        timeout,
        points,
        correctIds: correctIds(q),
        score: me.score,
        streak,
        rank,
        players,
        finished,
        progress,
        power: gotPower || me.power,
        gotPower,
        rivals,
      },
    });
  }

  const state = await playerState(db, room, p, { withQuestion: body.question !== false });
  return NextResponse.json({ state });
}

