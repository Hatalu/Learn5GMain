import { NextRequest, NextResponse } from 'next/server';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { AVATAR_COUNT, NICK_MAX, cleanNickname, isRoomCode } from '@/lib/game-creator/templates';
import { MAX_PLAYERS, ROOM_COLS, type RoomRow, admin, broadcast, hashToken, isExpired, newToken } from '@/lib/server/live';

export const dynamic = 'force-dynamic';

/**
 * เข้าห้องด้วยเลขห้อง 6 หลัก (ไม่ต้องมีบัญชี)
 * ขั้นแรกส่งแค่ code เพื่อตรวจว่ามีห้อง (check: true) แล้วค่อยส่งชื่อเล่น
 * ห้องเรียนหนึ่งห้องมักใช้ IP เดียวกันทั้งห้อง จึงตั้งโควตาต่อ IP ไว้สูง
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const ip = clientIp(req);
  if (!(await limit(`join:${ip}`, 150, 5 * 60 * 1000))) {
    return NextResponse.json({ error: 'มีคนเข้าจากเครือข่ายนี้เยอะมาก รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  if (!isRoomCode(body.code)) return NextResponse.json({ error: 'เลขห้องต้องเป็นตัวเลข 6 หลัก' }, { status: 400 });

  const db = admin();
  const { data, error } = await db.from('game_rooms').select(ROOM_COLS).eq('code', body.code).neq('status', 'closed').maybeSingle();
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) return NextResponse.json({ error: 'ระบบห้องเกมยังไม่พร้อม' }, { status: 503 });
  const room = data as RoomRow | null;
  if (!room || isExpired(room)) return NextResponse.json({ error: 'ไม่พบห้องนี้ ลองเช็กเลขห้องอีกครั้งนะ' }, { status: 404 });
  if (room.status === 'ended') return NextResponse.json({ error: 'เกมในห้องนี้จบไปแล้ว' }, { status: 409 });

  if (body.check === true) {
    return NextResponse.json({ ok: true, title: room.title, status: room.status, background: room.background });
  }

  const nickname = cleanNickname(body.nickname);
  if (!nickname) return NextResponse.json({ error: 'ตั้งชื่อเล่นก่อนนะ' }, { status: 400 });
  if (nickname.length > NICK_MAX) return NextResponse.json({ error: 'ชื่อยาวเกินไป' }, { status: 400 });
  const avatar = Number.isInteger(body.avatar) && (body.avatar as number) >= 0 && (body.avatar as number) < AVATAR_COUNT ? (body.avatar as number) : 0;

  const { count } = await db.from('room_players').select('id', { count: 'exact', head: true }).eq('room_id', room.id).eq('kicked', false);
  if ((count || 0) >= MAX_PLAYERS) return NextResponse.json({ error: 'ห้องนี้เต็มแล้ว' }, { status: 409 });

  const token = newToken();
  const { data: p, error: insErr } = await db
    .from('room_players')
    .insert({ room_id: room.id, nickname, avatar, token_hash: hashToken(token) })
    .select('id')
    .single();
  if (insErr || !p) {
    if (insErr?.code === '23505') return NextResponse.json({ error: 'ชื่อนี้มีเพื่อนใช้แล้ว ลองชื่ออื่นนะ' }, { status: 409 });
    return NextResponse.json({ error: 'เข้าห้องไม่สำเร็จ ลองใหม่อีกครั้ง' }, { status: 500 });
  }
  await broadcast(room.id, 'join', { nickname });
  return NextResponse.json({ ok: true, roomId: room.id, code: room.code, playerId: p.id, token });
}
