'use client';

/** ฝั่งเบราว์เซอร์ของห้องเล่นสด: เรียก API + ฟังสัญญาณ Realtime */
import { createClient } from '@/lib/supabase/client';
import type { PublicQuestion, RoomBackground, RoomStatus, PlayerPublic } from './types';
import type { AnswerOutcome, QuizEngine } from '@/components/creator/quiz/QuizRunner';

export interface PlayerCreds {
  playerId: string;
  token: string;
  roomId: string;
  code: string;
}

export interface PlayerStateRes {
  room: { id: string; code: string; title: string; status: RoomStatus; background: RoomBackground; total: number; round: number };
  me: PlayerPublic & { rank: number; players: number; pos: number };
  question: PublicQuestion | null;
}

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

export const playerApi = {
  check: (code: string) => post<{ ok: true; title: string; status: RoomStatus; background: RoomBackground }>('/api/live/join', { code, check: true }),
  join: (code: string, nickname: string, avatar: number) => post<{ roomId: string; code: string; playerId: string; token: string }>('/api/live/join', { code, nickname, avatar }),
  state: (c: Pick<PlayerCreds, 'playerId' | 'token'>) => post<{ state: PlayerStateRes }>('/api/live/player', { op: 'state', ...c }).then((j) => j.state),
  answer: (c: Pick<PlayerCreds, 'playerId' | 'token'>, pos: number, picks: string[]) =>
    post<{ result?: AnswerOutcome & { rank: number; players: number }; stale?: boolean; state?: PlayerStateRes }>('/api/live/player', { op: 'answer', pos, picks, ...c }),
  peek: (c: Pick<PlayerCreds, 'playerId' | 'token'>) => post<{ status: RoomStatus; background: RoomBackground; round: number }>('/api/live/player', { op: 'peek', ...c }),
  leave: (c: Pick<PlayerCreds, 'playerId' | 'token'>) => post('/api/live/player', { op: 'leave', ...c }).catch(() => null),
};

/** ตัวเล่นที่คุยกับเซิร์ฟเวอร์ (ตรวจคำตอบและจับเวลาที่เซิร์ฟเวอร์) */
export function liveEngine(c: Pick<PlayerCreds, 'playerId' | 'token'>, onState?: (s: PlayerStateRes) => void): QuizEngine {
  return {
    async next() {
      const s = await playerApi.state(c);
      onState?.(s);
      if (s.room.status !== 'playing') return null;
      return s.question;
    },
    async answer(q, picks) {
      const r = await playerApi.answer(c, q.index, picks);
      if (r.state) onState?.(r.state);
      if (r.stale || !r.result) return null;
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
