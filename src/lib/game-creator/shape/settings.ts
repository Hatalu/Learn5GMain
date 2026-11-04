/**
 * Human Shape Builder: ค่าที่ตั้งก่อนเล่น (ส่งผ่าน URL ของ /play/shape ไม่เก็บในฐานข้อมูล) + การคิดคะแนน
 * ครูปรับต่อได้ในหน้าเริ่มเกม (ชื่อทีม/รายชื่อนักเรียนตั้งในหน้าเกมเท่านั้น ไม่ใส่ใน URL)
 */
import { ALL_CATS } from './missions';

export interface ShapePts {
  /** ตอบคำถามถูก */
  answer: number;
  /** สร้างรูปสำเร็จ */
  mission: number;
  /** ทำตามเงื่อนไขครบ */
  cond: number;
  /** ความร่วมมือ */
  team: number;
  /** โบนัสสูงสุดเมื่อเสร็จเร็ว (คิดตามเวลาที่เหลือ) */
  time: number;
}

export interface ShapeSettings {
  /** 0 = เล่นเดี่ยว, 2-6 = จำนวนทีม */
  teams: number;
  /** เดี่ยว = จำนวนผู้เล่น, ทีม = สมาชิกต่อทีม */
  players: number;
  /** 0 ง่าย / 1 กลาง / 2 ยาก */
  level: number;
  /** หมวดภารกิจ (บิตตาม CATS) */
  cats: number;
  /** วินาทีต่อภารกิจ */
  time: number;
  scoring: boolean;
  /** จำนวนรอบ (0 = เท่าจำนวนคำถาม) */
  rounds: number;
  /** 0 = A คำถามแล้วสร้างรูป / 1 = B ตอบด้วยร่างกาย / 2 = C ภารกิจจากบทเรียน */
  pattern: number;
  /** 0 ระบบสุ่มภารกิจ / 1 ครูเลือกเอง */
  pick: number;
  /** 0 ตามลำดับ / 1 สุ่มคำถาม */
  order: number;
  pts: ShapePts;
  music: string;
}

export const SHAPE_TEAMS = [0, 2, 3, 4, 5, 6];
export const SHAPE_PLAYERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
export const SHAPE_TIMES = [30, 45, 60, 90, 120, 180];
export const SHAPE_ROUNDS = [3, 5, 8, 10, 15, 0];
export const PT_STEPS = [0, 1, 2, 3, 4, 5, 10, 15, 20];
export const PATTERNS = [
  { name: 'A: คำถาม แล้วสร้างรูป', desc: 'ตอบคำถามก่อน ครูตรวจแล้วสุ่มภารกิจสร้างรูปรับคะแนนเพิ่ม' },
  { name: 'B: ตอบด้วยร่างกาย', desc: 'สร้างตัวเลข/ท่าทางแทนหมายเลขคำตอบที่เลือก' },
  { name: 'C: ภารกิจจากบทเรียน', desc: 'ภารกิจเชื่อมกับเนื้อหาคำถาม แล้วอธิบายว่าเกี่ยวกันอย่างไร' },
];

export const SHAPE_DEFAULTS: ShapeSettings = {
  teams: 2,
  players: 4,
  level: 0,
  cats: ALL_CATS,
  time: 60,
  scoring: true,
  rounds: 5,
  pattern: 0,
  pick: 0,
  order: 0,
  pts: { answer: 10, mission: 10, cond: 5, team: 5, time: 5 },
  music: 'auto',
};

const pick = (v: string | null, ok: number[], d: number) => {
  const n = Number(v);
  return v !== null && v !== '' && ok.includes(n) ? n : d;
};
const PT_KEYS: [keyof ShapePts, string][] = [
  ['answer', 'pa'],
  ['mission', 'pm'],
  ['cond', 'pc'],
  ['team', 'pt'],
  ['time', 'pb'],
];

/** อ่านค่าจาก URL (ค่าแปลกปลอม = ค่าเริ่มต้น) */
export function parseShapeSettings(get: (k: string) => string | null): ShapeSettings {
  const d = SHAPE_DEFAULTS;
  const music = get('music') || 'auto';
  const c = Number(get('c'));
  const pts = { ...d.pts };
  for (const [k, q] of PT_KEYS) pts[k] = pick(get(q), PT_STEPS, d.pts[k]);
  return {
    teams: pick(get('teams'), SHAPE_TEAMS, d.teams),
    players: pick(get('m'), SHAPE_PLAYERS, d.players),
    level: pick(get('lv'), [0, 1, 2], d.level),
    cats: Number.isInteger(c) && c > 0 && c <= ALL_CATS ? c : d.cats,
    time: pick(get('t'), SHAPE_TIMES, d.time),
    scoring: get('sc') === null ? d.scoring : get('sc') === '1',
    rounds: pick(get('n'), SHAPE_ROUNDS, d.rounds),
    pattern: pick(get('p'), [0, 1, 2], d.pattern),
    pick: pick(get('pk'), [0, 1], d.pick),
    order: pick(get('o'), [0, 1], d.order),
    pts,
    music: /^[a-z0-9_-]{1,24}$/.test(music) ? music : 'auto',
  };
}

export function shapeQuery(gameId: string, s: ShapeSettings): string {
  const q = new URLSearchParams({
    id: gameId,
    teams: String(s.teams),
    m: String(s.players),
    lv: String(s.level),
    c: String(s.cats),
    t: String(s.time),
    sc: s.scoring ? '1' : '0',
    n: String(s.rounds),
    p: String(s.pattern),
    pk: String(s.pick),
    o: String(s.order),
    music: s.music,
  });
  for (const [k, key] of PT_KEYS) q.set(key, String(s.pts[k]));
  return q.toString();
}

/* ------------------------------ คะแนน ------------------------------ */

/** ผลที่ครูตัดสินของทีม/ผู้เล่นหนึ่งในรอบนั้น */
export interface Judge {
  ans: boolean | null;
  mis: boolean | null;
  cond: boolean;
  team: boolean;
  /** คะแนนที่ครูเพิ่ม/ลดเองในรอบนี้ */
  bonus: number;
}
export const EMPTY_JUDGE: Judge = { ans: null, mis: null, cond: false, team: false, bonus: 0 };

/** โบนัสเวลา: จำนวนเต็ม 0..max ตามสัดส่วนเวลาที่เหลือ */
export function timeBonus(max: number, remain: number, total: number): number {
  if (!(total > 0) || !(max > 0)) return 0;
  return Math.round(max * Math.min(1, Math.max(0, remain / total)));
}

/** คะแนนของรอบ (ปิดระบบคะแนน = 0) เงื่อนไข/ความร่วมมือ/เวลา นับเมื่อภารกิจสำเร็จเท่านั้น */
export function roundPoints(p: ShapePts, j: Judge, remain: number, total: number, on = true): number {
  if (!on) return 0;
  const ok = j.mis === true;
  return (j.ans === true ? p.answer : 0) + (ok ? p.mission + timeBonus(p.time, remain, total) + (j.cond ? p.cond : 0) + (j.team ? p.team : 0) : 0) + j.bonus;
}

/** คะแนนรวมไม่ติดลบ */
export const addScore = (score: number, delta: number) => Math.max(0, score + delta);

/** อันดับ (คะแนนเท่ากัน = อันดับเดียวกัน) คืนอันดับตามลำดับเดิม */
export function ranks(scores: number[]): number[] {
  return scores.map((s) => 1 + scores.filter((x) => x > s).length);
}

/** แบ่งรายชื่อเป็น k ทีมแบบสุ่ม (ขนาดต่างกันไม่เกิน 1) */
export function splitTeams<T>(names: T[], k: number, rnd: () => number = Math.random): T[][] {
  const a = [...names];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out: T[][] = Array.from({ length: Math.max(1, k) }, () => []);
  a.forEach((x, i) => out[i % out.length].push(x));
  return out;
}
