import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, rateLimit } from '@/lib/server/rate-limit';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { cleanBackground } from '@/lib/game-creator/backgrounds';
import { richToPlain } from '@/lib/game-creator/quiz';
import { AVATAR_COUNT } from '@/lib/game-creator/templates';
import {
  PLAYER_COLS,
  type PlayerRow,
  admin,
  broadcast,
  cleanSettings,
  compareRank,
  getUserId,
  hashToken,
  isUuid,
  loadRoom,
  newToken,
  toPublicPlayer,
} from '@/lib/server/live';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

async function hostRoom(id: string) {
  const uid = await getUserId();
  if (!uid) return { error: NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 }) };
  if (!isUuid(id)) return { error: NextResponse.json({ error: 'ไม่พบห้องนี้' }, { status: 404 }) };
  const db = admin();
  const room = await loadRoom(db, id);
  if (!room || room.host_id !== uid) return { error: NextResponse.json({ error: 'ไม่พบห้องนี้' }, { status: 404 }) };
  return { db, room, uid };
}

/** สถานะห้องสำหรับครู (ผู้เล่นทั้งหมด + คะแนน และสรุปรายข้อเมื่อขอ) */
export async function GET(req: NextRequest, { params }: Ctx) {
  const r = await hostRoom(params.id);
  if ('error' in r) return r.error;
  const { db, room, uid } = r;
  if (!rateLimit(`host-poll:${uid}`, 240, 60 * 1000)) return NextResponse.json({ error: 'ช้าลงหน่อยนะ' }, { status: 429 });

  const { data } = await db.from('room_players').select(PLAYER_COLS).eq('room_id', room.id).eq('kicked', false).order('joined_at', { ascending: true }).limit(400);
  const rows = (data || []) as PlayerRow[];
  const players = rows.map(toPublicPlayer).sort(compareRank(room.game));

  let stats: { i: number; label: string; answered: number; correct: number }[] | null = null;
  if (req.nextUrl.searchParams.get('stats') === '1') {
    const { data: ans } = await db.from('room_answers').select('q_index, correct').eq('room_id', room.id).limit(30000);
    const qs = room.content.questions;
    stats = qs.map((q, i) => ({ i, label: richToPlain(q.text, 70) || (q.media ? '(โจทย์เป็นรูป/คลิป)' : `ข้อ ${i + 1}`), answered: 0, correct: 0 }));
    (ans || []).forEach((a: { q_index: number; correct: boolean }) => {
      const s = stats![a.q_index];
      if (!s) return;
      s.answered++;
      if (a.correct) s.correct++;
    });
  }

  return NextResponse.json({
    room: {
      id: room.id,
      code: room.code,
      title: room.title,
      status: room.status,
      mode: room.mode,
      game: room.game,
      background: room.background,
      settings: room.settings,
      round: room.round,
      total: room.content.questions.length,
      createdAt: room.created_at,
      startedAt: room.started_at,
    },
    serverNow: Date.now(),
    players,
    hostPlayerId: rows.find((p) => p.is_host)?.id ?? null,
    stats,
  });
}

/** คำสั่งของครู: เริ่ม / จบ / เล่นใหม่ / ปิดห้อง / เตะผู้เล่น / เปลี่ยนพื้นหลัง / ตั้งค่า */
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const r = await hostRoom(params.id);
  if ('error' in r) return r.error;
  const { db, room, uid } = r;
  if (!rateLimit(`host-act:${uid}`, 90, 60 * 1000)) return NextResponse.json({ error: 'ช้าลงหน่อยนะ' }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  const now = new Date().toISOString();
  const action = String(body.action || '');

  if (room.status === 'closed' && action !== 'close') return NextResponse.json({ error: 'ห้องนี้ปิดไปแล้ว' }, { status: 409 });

  switch (action) {
    case 'start': {
      if (room.status !== 'lobby') return NextResponse.json({ ok: true });
      await db.from('game_rooms').update({ status: 'playing', started_at: now, ended_at: null }).eq('id', room.id);
      await broadcast(room.id, 'status', { status: 'playing' });
      return NextResponse.json({ ok: true });
    }
    case 'end': {
      if (room.status !== 'playing') return NextResponse.json({ ok: true });
      await db.from('game_rooms').update({ status: 'ended', ended_at: now }).eq('id', room.id);
      await broadcast(room.id, 'status', { status: 'ended' });
      return NextResponse.json({ ok: true });
    }
    case 'reset': {
      await db.from('room_answers').delete().eq('room_id', room.id);
      await db
        .from('room_players')
        .update({ score: 0, correct: 0, answered: 0, streak: 0, best_streak: 0, last_correct: null, q_pos: 0, q_started_at: null, finished_at: null, progress: 0, power: null, slip_at: null, stats: {} })
        .eq('room_id', room.id);
      await db.from('game_rooms').update({ status: 'lobby', round: room.round + 1, started_at: null, ended_at: null }).eq('id', room.id);
      await broadcast(room.id, 'status', { status: 'lobby' });
      return NextResponse.json({ ok: true });
    }
    case 'close': {
      if (room.status !== 'closed') {
        await db.from('game_rooms').update({ status: 'closed', closed_at: now }).eq('id', room.id);
        await broadcast(room.id, 'status', { status: 'closed' });
      }
      return NextResponse.json({ ok: true });
    }
    case 'kick': {
      if (!isUuid(body.playerId)) return NextResponse.json({ error: 'ไม่พบผู้เล่น' }, { status: 400 });
      await db.from('room_players').update({ kicked: true }).eq('id', body.playerId).eq('room_id', room.id).eq('is_host', false);
      await broadcast(room.id, 'kick', { playerId: body.playerId });
      return NextResponse.json({ ok: true });
    }
    case 'background': {
      const background = cleanBackground(body.background, mediaPrefix());
      await db.from('game_rooms').update({ background }).eq('id', room.id);
      await broadcast(room.id, 'bg', { background });
      return NextResponse.json({ ok: true, background });
    }
    case 'settings': {
      if (room.status !== 'lobby') return NextResponse.json({ error: 'เปลี่ยนได้ก่อนเริ่มเกมเท่านั้น' }, { status: 409 });
      const settings = cleanSettings(body.settings, room.game);
      await db.from('game_rooms').update({ settings }).eq('id', room.id);
      return NextResponse.json({ ok: true, settings });
    }
    case 'hostToken': {
      // ครูที่เลือก "เล่นเกมนี้ด้วย": ออกโทเคนผู้เล่นใหม่ให้เครื่องที่เปิดอยู่ (ใช้ได้แม้เปลี่ยนเครื่อง)
      if (room.mode !== 'play') return NextResponse.json({ error: 'ห้องนี้เจ้าของห้องดูอย่างเดียว' }, { status: 400 });
      const token = newToken();
      const { data: hp } = await db.from('room_players').select('id').eq('room_id', room.id).eq('is_host', true).maybeSingle();
      if (hp) {
        await db.from('room_players').update({ token_hash: hashToken(token), kicked: false }).eq('id', hp.id);
        return NextResponse.json({ ok: true, playerId: hp.id, token });
      }
      const { data: np } = await db
        .from('room_players')
        .insert({ room_id: room.id, nickname: 'เจ้าของห้อง', avatar: Math.floor(Math.random() * AVATAR_COUNT), token_hash: hashToken(token), is_host: true })
        .select('id')
        .single();
      if (!np) return NextResponse.json({ error: 'เข้าร่วมไม่สำเร็จ' }, { status: 500 });
      return NextResponse.json({ ok: true, playerId: np.id, token });
    }
    default:
      return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  }
}
