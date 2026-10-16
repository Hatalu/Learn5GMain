import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin, limit } from '@/lib/server/rate-limit';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { cleanBackground } from '@/lib/game-creator/backgrounds';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { isGameMode, modeById, modeFit, modeQuiz, type GameMode } from '@/lib/game-creator/modes';
import { AVATAR_COUNT, cleanNickname } from '@/lib/game-creator/templates';
import { MAX_OPEN_ROOMS, admin, cleanSettings, getMember, hashToken, isUuid, newToken, randomCode, sweepRooms } from '@/lib/server/live';

export const dynamic = 'force-dynamic';

/** เปิดใช้งานเกม: สร้างห้องพร้อมเลขห้อง 6 หลัก (สมาชิกเท่านั้น เปิดได้เฉพาะเกมของตัวเอง) */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const me = await getMember();
  if (!me) return NextResponse.json({ error: 'ต้องเป็นสมาชิกก่อนจึงจะเปิดเกมได้' }, { status: 401 });
  if (!(await limit(`room-open:${me.id}`, 30, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'เปิดห้องบ่อยเกินไป รอสักครู่นะ' }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  if (!isUuid(body.gameId)) return NextResponse.json({ error: 'ไม่พบเกมนี้' }, { status: 400 });
  const mode = body.mode === 'play' ? 'play' : 'watch';
  const gameMode: GameMode = isGameMode(body.game) ? body.game : 'quiz';

  // อ่านเกมด้วยสิทธิ์ของผู้ใช้เอง (RLS: อ่านได้เฉพาะเกมของตัวเอง)
  const supabase = await createClient();
  const { data: game } = await supabase.from('user_games').select('id, title, template, content, play_count').eq('id', body.gameId).maybeSingle();
  if (!game) return NextResponse.json({ error: 'ไม่พบเกมนี้ในคลังของคุณ' }, { status: 404 });

  const prefix = mediaPrefix();
  const raw = sanitizeQuiz(game.content, prefix);
  const fit = modeFit(raw, gameMode);
  if (!fit.ok) return NextResponse.json({ error: `ชุดคำถามนี้ใช้กับ ${modeById(gameMode).name} ไม่ได้: ต้องมีอย่างน้อย ${modeById(gameMode).minQuestions} ข้อ` }, { status: 400 });
  const content = modeQuiz(raw, gameMode);

  const db = admin();
  if (Math.random() < 0.15) await sweepRooms(db).catch(() => null);

  // ห้องที่เปิดค้างไว้เกินกำหนด: ปิดห้องเก่าสุดก่อน
  const { data: open } = await db.from('game_rooms').select('id').eq('host_id', me.id).neq('status', 'closed').order('created_at', { ascending: true });
  const extra = (open || []).length - (MAX_OPEN_ROOMS - 1);
  if (extra > 0) {
    const ids = (open || []).slice(0, extra).map((r) => r.id);
    await db.from('game_rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).in('id', ids);
  }

  let room: { id: string; code: string } | null = null;
  for (let i = 0; i < 12 && !room; i++) {
    const { data, error } = await db
      .from('game_rooms')
      .insert({
        code: randomCode(),
        game_id: game.id,
        host_id: me.id,
        title: game.title,
        template: game.template,
        game: gameMode,
        content,
        mode,
        background: cleanBackground(body.background, prefix),
        settings: cleanSettings(body.settings, gameMode),
      })
      .select('id, code')
      .single();
    if (data) room = data;
    else if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.code === '42P01' || error.code === 'PGRST205' ? 'ยังไม่ได้ติดตั้งฐานข้อมูลระบบสร้างเกม (migration 015)' : error.code === '42703' || error.code === 'PGRST204' ? 'ยังไม่ได้ติดตั้งฐานข้อมูลรูปแบบการเล่น (migration 017)' : 'เปิดห้องไม่สำเร็จ ลองใหม่อีกครั้ง' }, { status: 500 });
    }
  }
  if (!room) return NextResponse.json({ error: 'เลขห้องเต็มชั่วคราว ลองใหม่อีกครั้ง' }, { status: 503 });

  let hostPlayer: { id: string; token: string } | null = null;
  if (mode === 'play') {
    const token = newToken();
    const nickname = cleanNickname(body.nickname) || cleanNickname(me.username) || 'เจ้าของห้อง';
    const { data: p } = await db
      .from('room_players')
      .insert({ room_id: room.id, nickname, avatar: Math.floor(Math.random() * AVATAR_COUNT), token_hash: hashToken(token), is_host: true })
      .select('id')
      .single();
    if (p) hostPlayer = { id: p.id, token };
  }

  await db.from('user_games').update({ play_count: (game.play_count || 0) + 1 }).eq('id', game.id);

  return NextResponse.json({ roomId: room.id, code: room.code, hostPlayer });
}
