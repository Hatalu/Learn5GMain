'use client';

/** ฝั่งเบราว์เซอร์ของห้องเล่นสด: เรียก API + ฟังสัญญาณ Realtime */
import { createClient } from '@/lib/supabase/client';
import type { PublicQuestion, RoomBackground, RoomStatus, PlayerPublic } from './types';
import type { GameMode } from './modes';
import type { AnswerOutcome, QuizEngine } from '@/components/creator/quiz/QuizRunner';

export interface PlayerCreds {
  playerId: string;
  token: string;
  roomId: string;
  code: string;
}

export interface Rival {
  id: string;
  nickname: string;
  avatar: number;
  progress: number;
  finished: boolean;
}

export interface PlayerStateRes {
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
}

/** ผลการตอบ (รวมข้อมูลโหมดเกม) */
export type LiveOutcome = AnswerOutcome & { progress?: number; power?: string | null; gotPower?: string | null; rivals?: Rival[]; next?: PublicQuestion | null };

export class LiveError extends Error {
  constructor(
    msg: string,
    public kicked = false,
    public gone = false
  ) {
    super(msg);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  } catch {
    throw new LiveError('เชื่อมต่อไม่ได้ เช็กอินเทอร์เน็ตแล้วลองใหม่');
  }
  let j: Record<string, unknown> = {};
  try {
    j = await r.json();
  } catch {
    /* ignore */
  }
  if (!r.ok) throw new LiveError(String(j.error || 'เกิดข้อผิดพลาด'), !!j.kicked, !!j.gone);
  return j as T;
}

type C = Pick<PlayerCreds, 'playerId' | 'token'>;

export const playerApi = {
  check: (code: string) => post<{ ok: true; title: string; status: RoomStatus; background: RoomBackground }>('/api/live/join', { code, check: true }),
  join: (code: string, nickname: string, avatar: number) => post<{ roomId: string; code: string; playerId: string; token: string }>('/api/live/join', { code, nickname, avatar }),
  state: (c: C, question = true) => post<{ state: PlayerStateRes }>('/api/live/player', { op: 'state', question, ...c }).then((j) => j.state),
  answer: (c: C, pos: number, picks: string[]) => post<{ result?: LiveOutcome; stale?: boolean; state?: PlayerStateRes }>('/api/live/player', { op: 'answer', pos, picks, ...c }),
  peek: (c: C) => post<{ status: RoomStatus; background: RoomBackground; round: number; serverNow: number; progress: number; slipAt: string | null }>('/api/live/player', { op: 'peek', ...c }),
  sync: (c: C, score: number, stats: Record<string, number>) => post<{ ok: boolean; status: RoomStatus; score: number }>('/api/live/player', { op: 'sync', score, stats, ...c }),
  power: (c: C) => post<{ ok: boolean; power?: string; progress?: number; target?: string; reason?: string }>('/api/live/player', { op: 'power', ...c }),
  leave: (c: C) => post('/api/live/player', { op: 'leave', ...c }).catch(() => null),
};

/** ตัวเล่นที่คุยกับเซิร์ฟเวอร์ (ตรวจคำตอบและจับเวลาที่เซิร์ฟเวอร์) */
export function liveEngine(c: C, onState?: (s: PlayerStateRes) => void, onOutcome?: (o: LiveOutcome) => void): QuizEngine {
  // ข้อถัดไปที่เซิร์ฟเวอร์ส่งมาพร้อมผลตอบ (ไม่ต้องขอใหม่)
  let queued: PublicQuestion | null = null;
  return {
    async next() {
      if (queued) {
        const q = queued;
        queued = null;
        return q;
      }
      const s = await playerApi.state(c);
      onState?.(s);
      if (s.room.status !== 'playing') return null;
      return s.question;
    },
    async answer(q, picks) {
      const r = await playerApi.answer(c, q.index, picks);
      if (r.state) onState?.(r.state);
      queued = null;
      if (r.stale || !r.result) return null;
      queued = r.result.next || null;
      onOutcome?.(r.result);
      return r.result;
    },
  };
}

/* ------------------------------ จำผู้เล่นในเครื่อง ------------------------------ */

const KEY = (code: string) => `l5g_play_${code}`;

export function saveCreds(c: PlayerCreds) {
  try {
    localStorage.setItem(KEY(c.code), JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
export function loadCreds(code: string): PlayerCreds | null {
  try {
    const raw = localStorage.getItem(KEY(code));
    return raw ? (JSON.parse(raw) as PlayerCreds) : null;
  } catch {
    return null;
  }
}
export function clearCreds(code: string) {
  try {
    localStorage.removeItem(KEY(code));
  } catch {
    /* ignore */
  }
}

/* ------------------------------ Realtime ------------------------------ */

export type RoomEvent = { event: string; payload: Record<string, unknown> };

/** ฟังสัญญาณของห้อง คืนฟังก์ชันยกเลิก และแจ้งว่าเชื่อมต่อสำเร็จไหม (ถ้าไม่สำเร็จให้ถามสถานะถี่ขึ้น) */
export function subscribeRoom(roomId: string, onEvent: (e: RoomEvent) => void, onLive: (live: boolean) => void): () => void {
  let ch: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
  try {
    const sb = createClient();
    ch = sb.channel(`l5g-room-${roomId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: '*' }, (m: { event: string; payload?: Record<string, unknown> }) => onEvent({ event: m.event, payload: m.payload || {} }));
    ch.subscribe((status: string) => onLive(status === 'SUBSCRIBED'));
  } catch {
    onLive(false);
  }
  return () => {
    try {
      if (ch) createClient().removeChannel(ch);
    } catch {
      /* ignore */
    }
  };
}
