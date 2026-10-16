import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, rateLimit } from '@/lib/server/rate-limit';
import { checkAnswer, correctIds, isTimeout, scoreFor } from '@/lib/game-creator/quiz';
import { PLAYER_COLS, type PlayerRow, admin, authPlayer, broadcast, loadRoom, orderFor, playerState, rankOf } from '@/lib/server/live';

export const dynamic = 'force-dynamic';

/**
 * คำขอของผู้เล่น (ใช้โทเคนที่ได้ตอนเข้าห้อง)
 * op: 'state'  ดูสถานะ/รับคำถามข้อปัจจุบัน
 *     'answer' ส่งคำตอบ { pos, picks } ตรวจและคิดคะแนนที่เซิร์ฟเวอร์
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
  if (!rateLimit(`player:${p.id}`, 100, 60 * 1000)) return NextResponse.json({ error: 'ช้าลงหน่อยนะ' }, { status: 429 });
  if (p.kicked) return NextResponse.json({ error: 'คุณถูกเชิญออกจากห้อง', kicked: true }, { status: 403 });

  const room = await loadRoom(db, p.room_id);
  if (!room) return NextResponse.json({ error: 'ไม่พบห้องนี้', gone: true }, { status: 404 });

  const op = String(body.op || 'state');

  if (op === 'peek') {
    // ดูแค่สถานะห้อง (ไม่เริ่มจับเวลาข้อถัดไป) ใช้ถามเป็นระยะระหว่างเล่น
    return NextResponse.json({ status: room.status, background: room.background, round: room.round });
  }

  if (op === 'leave') {
    if (room.status === 'lobby' && !p.is_host) {
      await db.from('room_players').delete().eq('id', p.id);
      await broadcast(room.id, 'join', {});
    }
    return NextResponse.json({ ok: true });
  }

  if (op === 'answer') {
    const pos = Number(body.pos);
    const picks = Array.isArray(body.picks) ? body.picks.filter((x): x is string => typeof x === 'string').slice(0, 6) : [];
    if (room.status !== 'playing' || p.finished_at || pos !== p.q_pos) {
      return NextResponse.json({ stale: true, state: await playerState(db, room, p) });
    }
    const order = orderFor(room, p);
    const qIndex = order[p.q_pos];
    const q = room.content.questions[qIndex];
    if (!q) return NextResponse.json({ stale: true, state: await playerState(db, room, p) });

    const startedAt = p.q_started_at ? new Date(p.q_started_at).getTime() : Date.now();
    const elapsed = Math.max(0, Date.now() - startedAt);
    const timeout = isTimeout(q, elapsed);
    const correct = !timeout && checkAnswer(q, picks);
    const points = scoreFor(q, correct, elapsed, p.streak);

    const { error: insErr } = await db
      .from('room_answers')
      .insert({ room_id: room.id, player_id: p.id, q_index: qIndex, picks, correct, points, ms: Math.min(elapsed, 2147483647) });
    if (insErr) {
      // ตอบข้อนี้ไปแล้ว (กดซ้ำ/เน็ตส่งซ้ำ)
      const { data: fresh } = await db.from('room_players').select(PLAYER_COLS).eq('id', p.id).maybeSingle();
      return NextResponse.json({ stale: true, state: await playerState(db, room, (fresh as PlayerRow) || p) });
    }

    const total = room.content.questions.length;
    const streak = correct ? p.streak + 1 : 0;
    const next = p.q_pos + 1;
    const now = new Date().toISOString();
    const { data: upd } = await db
      .from('room_players')
      .update({
        score: p.score + points,
        correct: p.correct + (correct ? 1 : 0),
        answered: p.answered + 1,
        streak,
        best_streak: Math.max(p.best_streak, streak),
        last_correct: correct,
        q_pos: next,
        q_started_at: null,
        finished_at: next >= total ? now : null,
        last_seen_at: now,
      })
      .eq('id', p.id)
      .eq('q_pos', p.q_pos)
      .select(PLAYER_COLS)
      .maybeSingle();
    const me = (upd as PlayerRow) || p;
    const { rank, players } = await rankOf(db, room, me);
    return NextResponse.json({
      result: { correct, timeout, points, correctIds: correctIds(q), score: me.score, streak, rank, players, finished: next >= total },
    });
  }

  return NextResponse.json({ state: await playerState(db, room, p) });
}
