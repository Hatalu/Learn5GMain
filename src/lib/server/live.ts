/**
 * ห้องเล่นสดของระบบสร้างเกม (ฝั่งเซิร์ฟเวอร์เท่านั้น)
 * - ผู้เล่นไม่ต้องมีบัญชี: ได้โทเคนลับตอนเข้าห้อง เก็บในฐานข้อมูลแบบ hash
 * - เฉลยอยู่ที่เซิร์ฟเวอร์เท่านั้น ผู้เล่นได้รับคำถามทีละข้อแบบไม่มีเฉลย ตรวจคำตอบ/จับเวลาที่เซิร์ฟเวอร์
 * - แจ้งเหตุการณ์แบบทันทีผ่าน Supabase Realtime Broadcast (ถ้าใช้ไม่ได้ หน้าเว็บจะถามสถานะเป็นระยะแทน)
 */
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { hasMembership } from '@/lib/membership';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { cleanBackground } from '@/lib/game-creator/backgrounds';
import { publicQuestion, questionOrder, sanitizeQuiz } from '@/lib/game-creator/quiz';
import type { PlayerPublic, PublicQuestion, QuizContent, RoomBackground, RoomSettings, RoomStatus } from '@/lib/game-creator/types';

export const MAX_PLAYERS = 150;
export const ROOM_TTL_HOURS = 12;
export const MAX_OPEN_ROOMS = 5;

export interface RoomRow {
  id: string;
  code: string;
  game_id: string | null;
  host_id: string;
  title: string;
  template: string;
  content: QuizContent;
  mode: 'watch' | 'play';
  status: RoomStatus;
  background: RoomBackground;
  settings: RoomSettings;
  round: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  nickname: string;
  avatar: number;
  token_hash: string;
  is_host: boolean;
  score: number;
  correct: number;
  answered: number;
  streak: number;
  best_streak: number;
  last_correct: boolean | null;
  q_pos: number;
  q_started_at: string | null;
  finished_at: string | null;
  kicked: boolean;
}

export const ROOM_COLS = 'id, code, game_id, host_id, title, template, content, mode, status, background, settings, round, created_at, started_at, ended_at';
export const PLAYER_COLS =
  'id, room_id, nickname, avatar, token_hash, is_host, score, correct, answered, streak, best_streak, last_correct, q_pos, q_started_at, finished_at, kicked';

export const admin = () => getAdminClient();

/* ------------------------------- สมาชิก ------------------------------- */

/** ผู้ใช้ที่ล็อกอินและเป็นสมาชิก (ไม่นับบัญชีทดลอง) คืน null ถ้าไม่ใช่ */
export async function getMember(): Promise<{ id: string; username: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('username, role, premium_until').eq('id', user.id).maybeSingle();
  if (!p || String(p.username || '').startsWith('trial_') || !hasMembership(p)) return null;
  return { id: user.id, username: p.username };
}

export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/* ------------------------------- โทเคน/เลขห้อง ------------------------------- */

export const newToken = () => crypto.randomBytes(24).toString('base64url');
export const hashToken = (t: string) => crypto.createHash('sha256').update(`l5g-room:${t}`).digest('base64url');

export function tokenMatches(token: unknown, hash: string): boolean {
  if (typeof token !== 'string' || token.length < 20 || token.length > 64) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function randomCode(): string {
  // 100000-999999 (ไม่ขึ้นต้นด้วย 0 อ่านออกเสียงง่าย)
  return String(100000 + crypto.randomInt(900000));
}

export const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export function cleanSettings(input: unknown): RoomSettings {
  const s = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return { shuffleQuestions: s.shuffleQuestions === true, shuffleChoices: s.shuffleChoices === true };
}

export function normalizeRoom(r: RoomRow): RoomRow {
  return {
    ...r,
    content: sanitizeQuiz(r.content, mediaPrefix()),
    background: cleanBackground(r.background, mediaPrefix()),
    settings: cleanSettings(r.settings),
  };
}

export function isExpired(r: Pick<RoomRow, 'created_at'>): boolean {
  return Date.now() - new Date(r.created_at).getTime() > ROOM_TTL_HOURS * 3600 * 1000;
}

/* ------------------------------- Realtime ------------------------------- */

export const roomTopic = (roomId: string) => `l5g-room-${roomId}`;

/** ส่งสัญญาณให้ทุกคนในห้องดึงสถานะใหม่ (ไม่รอผล ไม่พังถ้า Realtime ใช้ไม่ได้) */
export async function broadcast(roomId: string, event: string, payload: Record<string, unknown> = {}) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) return;
  try {
    await fetch(`${base}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ topic: roomTopic(roomId), event, payload: { ...payload, at: Date.now() } }] }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* ผู้เล่นจะถามสถานะเองเป็นระยะ */
  }
}

/* ------------------------------- ห้อง/ผู้เล่น ------------------------------- */

export async function loadRoom(db: SupabaseClient, id: string): Promise<RoomRow | null> {
  const { data } = await db.from('game_rooms').select(ROOM_COLS).eq('id', id).maybeSingle();
  if (!data) return null;
  const room = normalizeRoom(data as RoomRow);
  if (room.status !== 'closed' && isExpired(room)) {
    await db.from('game_rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id);
    room.status = 'closed';
  }
  return room;
}

export async function authPlayer(db: SupabaseClient, playerId: unknown, token: unknown): Promise<PlayerRow | null> {
  if (!isUuid(playerId)) return null;
  const { data } = await db.from('room_players').select(PLAYER_COLS).eq('id', playerId).maybeSingle();
  if (!data || !tokenMatches(token, (data as PlayerRow).token_hash)) return null;
  return data as PlayerRow;
}

export const toPublicPlayer = (p: PlayerRow): PlayerPublic => ({
  id: p.id,
  nickname: p.nickname,
  avatar: p.avatar,
  isHost: p.is_host,
  score: p.score,
  correct: p.correct,
  answered: p.answered,
  streak: p.streak,
  finished: !!p.finished_at,
  lastCorrect: p.last_correct,
});

export const playerSeed = (p: Pick<PlayerRow, 'id'>, round: number) => `${p.id}:${round}`;

export function orderFor(room: RoomRow, p: PlayerRow): number[] {
  return questionOrder(room.content.questions.length, room.settings.shuffleQuestions, playerSeed(p, room.round));
}

/** อันดับของผู้เล่น (1 = ที่หนึ่ง) และจำนวนผู้เล่นทั้งหมด */
export async function rankOf(db: SupabaseClient, room: RoomRow, p: PlayerRow): Promise<{ rank: number; players: number }> {
  const { data } = await db.from('room_players').select('id, score').eq('room_id', room.id).eq('kicked', false);
  const rows = (data || []) as { id: string; score: number }[];
  const rank = rows.filter((r) => r.score > p.score).length + 1;
  return { rank, players: rows.length };
}

export interface PlayerState {
  room: { id: string; code: string; title: string; status: RoomStatus; background: RoomBackground; total: number; round: number };
  me: PlayerPublic & { rank: number; players: number; pos: number };
  question: PublicQuestion | null;
  kicked?: boolean;
}

/** สถานะของผู้เล่น: ถ้ากำลังเล่น จะส่งคำถามข้อปัจจุบัน (เริ่มจับเวลาตอนส่งข้อนั้นครั้งแรก) */
export async function playerState(db: SupabaseClient, room: RoomRow, p0: PlayerRow): Promise<PlayerState> {
  let p = p0;
  const total = room.content.questions.length;
  let question: PublicQuestion | null = null;
  if (room.status === 'playing' && !p.finished_at && p.q_pos < total) {
    let started = p.q_started_at;
    if (!started) {
      const now = new Date().toISOString();
      const { data } = await db
        .from('room_players')
        .update({ q_started_at: now, last_seen_at: now })
        .eq('id', p.id)
        .eq('q_pos', p.q_pos)
        .is('q_started_at', null)
        .select(PLAYER_COLS)
        .maybeSingle();
      if (data) p = data as PlayerRow;
      started = p.q_started_at || now;
    }
    const order = orderFor(room, p);
    const q = room.content.questions[order[p.q_pos]];
    if (q) {
      question = publicQuestion(q, p.q_pos, total, {
        shuffleChoices: room.settings.shuffleChoices,
        seed: playerSeed(p, room.round),
        elapsedMs: Date.now() - new Date(started).getTime(),
      });
    }
  }
  const showRank = room.status !== 'lobby';
  const r = showRank ? await rankOf(db, room, p) : { rank: 0, players: 0 };
  return {
    room: { id: room.id, code: room.code, title: room.title, status: room.status, background: room.background, total, round: room.round },
    me: { ...toPublicPlayer(p), rank: r.rank, players: r.players, pos: p.q_pos },
    question,
  };
}

/** เก็บกวาดห้องเก่า (เรียกเป็นครั้งคราว) */
export async function sweepRooms(db: SupabaseClient) {
  const now = Date.now();
  const closeBefore = new Date(now - ROOM_TTL_HOURS * 3600 * 1000).toISOString();
  await db.from('game_rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).neq('status', 'closed').lt('created_at', closeBefore);
  await db.from('game_rooms').delete().eq('status', 'closed').lt('created_at', new Date(now - 7 * 24 * 3600 * 1000).toISOString());
}
