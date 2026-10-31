/**
 * ข้อมูลสะสมของสงครามอวกาศ AR เก็บในเครื่องนี้ (localStorage) ไม่ต้องล็อกอิน ไม่ส่งขึ้นเซิร์ฟเวอร์
 * เหรียญ อัปเกรด ดาวแต่ละด่าน ชุดคำถามที่ครูผูกกับด่าน ภารกิจ ตัวนับสะสม
 * อ่าน/เขียนพังได้ (โหมดส่วนตัว/ปิด storage) = เล่นได้ปกติแต่ไม่จำ
 */
import { ALL_STAGES } from './map';
import { ACHIEVEMENTS, cleanMission, cleanStats, dayKey, ZERO_STATS, type MissionDef, type Stats } from './missions';
import { cleanUps, NO_UPS, type UpLevels } from './upgrades';

const KEY = 'l5g_ar_v1';

export interface ArSave {
  coins: number;
  ups: UpLevels;
  stars: Record<string, number>;
  /** ด่าน -> id ชุดคำถาม (ครูกำหนด) */
  sets: Record<string, string>;
  /** ครูตั้งภารกิจประจำวันเอง (null = สุ่มตามวัน) */
  custom: MissionDef[] | null;
  day: string;
  /** ตัวนับของวันนี้ */
  today: Stats;
  /** ภารกิจประจำวันที่รับรางวัลแล้ว (ลำดับในรายการของวันนั้น) */
  claimed: number[];
  total: Stats;
  ach: string[];
  /** ครูปลดล็อกทุกด่าน */
  openAll: boolean;
}

export const EMPTY_SAVE = (): ArSave => ({ coins: 0, ups: { ...NO_UPS }, stars: {}, sets: {}, custom: null, day: dayKey(), today: { ...ZERO_STATS }, claimed: [], total: { ...ZERO_STATS }, ach: [], openAll: false });

const UUID = /^[0-9a-f-]{36}$/i;

export function cleanSave(v: unknown): ArSave {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = EMPTY_SAVE();
  s.coins = Math.max(0, Math.min(1e6, Math.floor(Number(o.coins) || 0)));
  s.ups = cleanUps(o.ups);
  const ids = new Set(ALL_STAGES.map((x) => x.id));
  const stars = (o.stars && typeof o.stars === 'object' ? o.stars : {}) as Record<string, unknown>;
  for (const [k, n] of Object.entries(stars)) if (ids.has(k)) s.stars[k] = Math.max(0, Math.min(3, Math.floor(Number(n) || 0)));
  const sets = (o.sets && typeof o.sets === 'object' ? o.sets : {}) as Record<string, unknown>;
  for (const [k, id] of Object.entries(sets)) if (ids.has(k) && typeof id === 'string' && UUID.test(id)) s.sets[k] = id;
  s.custom = Array.isArray(o.custom) ? (o.custom.map(cleanMission).filter(Boolean) as MissionDef[]).slice(0, 5) : null;
  if (s.custom && !s.custom.length) s.custom = null;
  s.day = typeof o.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.day) ? o.day : dayKey();
  s.today = cleanStats(o.today);
  s.claimed = Array.isArray(o.claimed) ? o.claimed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 5) : [];
  s.total = cleanStats(o.total);
  const achIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  s.ach = Array.isArray(o.ach) ? o.ach.filter((a): a is string => typeof a === 'string' && achIds.has(a)) : [];
  s.openAll = o.openAll === true;
  return rollDay(s);
}

/** ข้ามวันแล้วล้างตัวนับประจำวัน */
export function rollDay(s: ArSave, now = new Date()): ArSave {
  const d = dayKey(now);
  if (s.day === d) return s;
  return { ...s, day: d, today: { ...ZERO_STATS }, claimed: [] };
}

export function loadSave(): ArSave {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanSave(JSON.parse(raw)) : EMPTY_SAVE();
  } catch {
    return EMPTY_SAVE();
  }
}

export function writeSave(s: ArSave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
