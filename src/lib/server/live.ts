/**
 * ห้องเล่นสดของระบบสร้างเกม (ฝั่งเซิร์ฟเวอร์เท่านั้น)
 * - ผู้เล่นไม่ต้องมีบัญชี: ได้โทเคนลับตอนเข้าห้อง เก็บในฐานข้อมูลแบบ hash
 * - เฉลยอยู่ที่เซิร์ฟเวอร์เท่านั้น ผู้เล่นได้รับคำถามทีละข้อแบบไม่มีเฉลย ตรวจคำตอบ/จับเวลาที่เซิร์ฟเวอร์
 * - รูปแบบการเล่น (game): quiz = ตอบครบชุด / cafe, tower = เล่นตามเวลา คำถามวนซ้ำ / racing = ถึงเส้นชัยก่อนชนะ
 * - แจ้งเหตุการณ์แบบทันทีผ่าน Supabase Realtime Broadcast (ถ้าใช้ไม่ได้ หน้าเว็บจะถามสถานะเป็นระยะแทน)
 */
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { hasMembership } from '@/lib/membership';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { cleanBackground } from '@/lib/game-creator/backgrounds';
import { endlessIndex, publicQuestion, questionOrder, sanitizeQuiz } from '@/lib/game-creator/quiz';
import { cleanModeSettings, isGameMode, modeById, type GameMode } from '@/lib/game-creator/modes';
import type { PlayerPublic, PublicQuestion, QuizContent, QuizQuestion, RoomBackground, RoomSettings, RoomStatus } from '@/lib/game-creator/types';

export const MAX_PLAYERS = 150;
export const ROOM_TTL_HOURS = 12;
export const MAX_OPEN_ROOMS = 5;
/** เวลาเผื่อหลังหมดเวลาเล่น ก่อนเซิร์ฟเวอร์ปิดเกมเอง (วินาที) */
export const END_GRACE_SECONDS = 8;

export interface RoomRow {
  id: string;
  code: string;
  game_id: string | null;
  host_id: string;
  title: string;
  template: string;
  game: GameMode;
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
  progress: number;
  power: string | null;
  slip_at: string | null;
  stats: Record<string, number> | null;
}

export const ROOM_COLS = 'id, code, game_id, host_id, title, template, game, content, mode, status, background, settings, round, created_at, started_at, ended_at';
export const PLAYER_COLS =
  'id, room_id, nickname, avatar, token_hash, is_host, score, correct, answered, streak, best_streak, last_correct, q_pos, q_started_at, finished_at, kicked, progress, power, slip_at, stats';

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

export function cleanSettings(input: unknown, game: GameMode = 'quiz'): RoomSettings {
  const s = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return { shuffleQuestions: s.shuffleQuestions === true, shuffleChoices: s.shuffleChoices === true, ...cleanModeSettings(game, s) };
}

export function normalizeRoom(r: RoomRow): RoomRow {
  const game: GameMode = isGameMode(r.game) ? r.game : 'quiz';
  return {
    ...r,
    game,
    content: sanitizeQuiz(r.content, mediaPrefix()),
    background: cleanBackground(r.background, mediaPrefix()),
    settings: cleanSettings(r.settings, game),
  };
}

export function isExpired(r: Pick<RoomRow, 'created_at'>): boolean {
  return Date.now() - new Date(r.created_at).getTime() > ROOM_TTL_HOURS * 3600 * 1000;
}

/** โหมดจับเวลา: หมดเวลาเล่นแล้วหรือยัง (นับเผื่อเวลาเน็ต) */
export function isTimeUp(room: RoomRow, graceSec = END_GRACE_SECONDS): boolean {
  if (!modeById(room.game).durations || !room.started_at || !room.settings.duration) return false;
  return Date.now() > new Date(room.started_at).getTime() + (room.settings.duration + graceSec) * 1000;
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

export async function endRoom(db: SupabaseClient, room: RoomRow) {
  if (room.status !== 'playing') return;
  const { data } = await db.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', room.id).eq('status', 'playing').select('id');
  room.status = 'ended';
  if (data && data.length) await broadcast(room.id, 'status', { status: 'ended' });
}

export async function loadRoom(db: SupabaseClient, id: string): Promise<RoomRow | null> {
  const { data } = await db.from('game_rooms').select(ROOM_COLS).eq('id', id).maybeSingle();
  if (!data) return null;
  const room = normalizeRoom(data as RoomRow);
  if (room.status !== 'closed' && isExpired(room)) {
    await db.from('game_rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id);
    room.status = 'closed';
  }
  // หมดเวลาแล้วแต่ครูไม่ได้กดจบ (เช่นปิดหน้าจอไป): เซิร์ฟเวอร์จบเกมให้เอง
  if (room.status === 'playing' && isTimeUp(room)) await endRoom(db, room);
  return room;
}

export async function authPlayer(db: SupabaseClient, playerId: unknown, token: unknown): Promise<PlayerRow | null> {
  if (!isUuid(playerId)) return null;
  const { data } = await db.from('room_players').select(PLAYER_COLS).eq('id', playerId).maybeSingle();
  if (!data || !tokenMatches(token, (data as PlayerRow).token_hash)) return null;
  return data as PlayerRow;
}

export function cleanStats(s: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!s || typeof s !== 'object') return out;
  Object.entries(s as Record<string, unknown>)
    .slice(0, 8)
    .forEach(([k, v]) => {
      if (/^[a-z]{1,12}$/.test(k) && typeof v === 'number' && isFinite(v)) out[k] = Math.max(0, Math.min(1e7, Math.round(v)));
    });
  return out;
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
  progress: p.progress || 0,
  power: p.power,
  finishedAt: p.finished_at,
  stats: cleanStats(p.stats),
});

export const playerSeed = (p: Pick<PlayerRow, 'id'>, round: number) => `${p.id}:${round}`;

/** ข้อที่ผู้เล่นต้องตอบที่ลำดับ pos (โหมดควิซ: ตามลำดับ/สลับครั้งเดียว, โหมดเกม: วนซ้ำไม่จำกัด) */
export function questionAt(room: RoomRow, p: PlayerRow, pos: number): { q: QuizQuestion; index: number } | null {
  const n = room.content.questions.length;
  if (!n) return null;
  let index: number;
  if (modeById(room.game).endless) index = endlessIndex(n, pos, playerSeed(p, room.round));
  else {
    if (pos >= n) return null;
    index = questionOrder(n, room.settings.shuffleQuestions, playerSeed(p, room.round))[pos];
  }
  const q = room.content.questions[index];
  return q ? { q, index } : null;
}

/** การจัดอันดับ: Racing = เข้าเส้นชัยก่อน แล้วระยะทาง / อื่นๆ = คะแนน */
export function compareRank(game: GameMode) {
  return (a: Pick<PlayerPublic, 'score' | 'correct' | 'progress' | 'finishedAt'>, b: Pick<PlayerPublic, 'score' | 'correct' | 'progress' | 'finishedAt'>) => {
    if (game === 'racing') {
      if (a.finishedAt && b.finishedAt) return a.finishedAt.localeCompare(b.finishedAt);
      if (a.finishedAt) return -1;
      if (b.finishedAt) return 1;
      return b.progress - a.progress || b.correct - a.correct;
    }
    return b.score - a.score || b.correct - a.correct;
  };
}

export interface Rival {
  id: string;
  nickname: string;
  avatar: number;
  progress: number;
  finished: boolean;
}

/** อันดับของผู้เล่น (1 = ที่หนึ่ง) จำนวนผู้เล่น และคู่แข่งใกล้ๆ (Racing) */
export async function rankOf(db: SupabaseClient, room: RoomRow, p: PlayerRow): Promise<{ rank: number; players: number; rivals: Rival[] }> {
  const { data } = await db.from('room_players').select('id, nickname, avatar, score, correct, progress, finished_at').eq('room_id', room.id).eq('kicked', false).limit(400);
  const rows = ((data || []) as { id: string; nickname: string; avatar: number; score: number; correct: number; progress: number; finished_at: string | null }[]).map((r) => ({
    ...r,
    progress: r.progress || 0,
    finishedAt: r.finished_at,
  }));
  const me = rows.find((r) => r.id === p.id) || { id: p.id, nickname: p.nickname, avatar: p.avatar, score: p.score, correct: p.correct, progress: p.progress || 0, finishedAt: p.finished_at, finished_at: p.finished_at };
  const sorted = rows.slice().sort(compareRank(room.game));
  const idx = sorted.findIndex((r) => r.id === p.id);
  const rank = idx >= 0 ? idx + 1 : sorted.filter((r) => compareRank(room.game)(r, me) < 0).length + 1;
  let rivals: Rival[] = [];
  if (room.game === 'racing') {
    const near = sorted.slice(Math.max(0, idx - 3), Math.max(0, idx - 3) + 7);
    rivals = near.map((r) => ({ id: r.id, nickname: r.nickname, avatar: r.avatar, progress: r.progress, finished: !!r.finishedAt }));
  }
  return { rank, players: rows.length, rivals };
}

export interface PlayerState {
  room: {
    id: string;
    code: string;
    title: string;
    status: RoomStatus;
    background: RoomBackground;
    total: number;
    round: number;
    game: GameMode;
    duration: number;
    goal: number;
    startedAt: string | null;
  };
  serverNow: number;
  me: PlayerPublic & { rank: number; players: number; pos: number; slipAt: string | null };
  rivals: Rival[];
  question: PublicQuestion | null;
  kicked?: boolean;
}

/** สถานะของผู้เล่น: ถ้ากำลังเล่น จะส่งคำถามข้อปัจจุบัน (เริ่มจับเวลาตอนส่งข้อนั้นครั้งแรก) */
export async function playerState(db: SupabaseClient, room: RoomRow, p0: PlayerRow, opts: { withQuestion?: boolean } = {}): Promise<PlayerState> {
  let p = p0;
  const endless = modeById(room.game).endless;
  const total = endless ? 0 : room.content.questions.length;
  let question: PublicQuestion | null = null;
  const done = room.game === 'quiz' ? !!p.finished_at : room.game === 'racing' && !!p.finished_at;
  if ((opts.withQuestion ?? true) && room.status === 'playing' && !done) {
    const at = questionAt(room, p, p.q_pos);
    if (at) {
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
      question = publicQuestion(at.q, p.q_pos, total, {
        shuffleChoices: room.settings.shuffleChoices || endless,
        seed: `${playerSeed(p, room.round)}:${p.q_pos}`,
        elapsedMs: Date.now() - new Date(started).getTime(),
      });
      // โหมดเกมไม่มีเวลาต่อข้อ (ความกดดันมาจากตัวเกมเอง)
      if (endless) question.time = 0;
    }
  }
  const showRank = room.status !== 'lobby';
  const r = showRank ? await rankOf(db, room, p) : { rank: 0, players: 0, rivals: [] };
  return {
    room: {
      id: room.id,
      code: room.code,
      title: room.title,
      status: room.status,
      background: room.background,
      total,
      round: room.round,
      game: room.game,
      duration: room.settings.duration,
      goal: room.settings.goal,
      startedAt: room.started_at,
    },
    serverNow: Date.now(),
    me: { ...toPublicPlayer(p), rank: r.rank, players: r.players, pos: p.q_pos, slipAt: p.slip_at },
    rivals: r.rivals,
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
