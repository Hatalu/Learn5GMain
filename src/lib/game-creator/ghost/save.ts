/**
 * ข้อมูลสะสมของ Ghost Hunter AR เก็บในเครื่องนี้ (localStorage) ไม่ต้องล็อกอิน ไม่ส่งขึ้นเซิร์ฟเวอร์
 * Ghost Coins ความรู้ (ปลดอุปกรณ์/เลเวลนักล่า) อัปเกรด ตัวละคร ดาวแต่ละสถานที่ ผีที่จับได้ (จำนวนต่อชนิด) ชุดคำถามที่ครูผูกกับสถานที่
 */
import { DEFAULT_LOOK, GHOSTS, NO_SKILLS, PLACES, cleanLook, cleanSkills, type GhostId, type Look, type Skills } from './data';

const KEY = 'l5g_ghost_v1';

export interface GhostSave {
  coins: number;
  knowledge: number;
  skills: Skills;
  look: Look;
  stars: Record<string, number>;
  /** ผีที่จับได้: ชนิด -> จำนวน */
  caught: Partial<Record<GhostId, number>>;
  puzzles: number;
  rescued: number;
  sets: Record<string, string>;
  openAll: boolean;
}

export const EMPTY_GHOST = (): GhostSave => ({ coins: 0, knowledge: 0, skills: { ...NO_SKILLS }, look: { ...DEFAULT_LOOK }, stars: {}, caught: {}, puzzles: 0, rescued: 0, sets: {}, openAll: false });

const UUID = /^[0-9a-f-]{36}$/i;
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const obj = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;

export function cleanGhost(v: unknown): GhostSave {
  const o = obj(v);
  const s = EMPTY_GHOST();
  s.coins = num(o.coins, 1e6);
  s.knowledge = num(o.knowledge, 1e6);
  s.skills = cleanSkills(o.skills);
  s.look = cleanLook(o.look);
  const ids = new Set(PLACES.map((p) => p.id));
  for (const [k, n] of Object.entries(obj(o.stars))) if (ids.has(k)) s.stars[k] = num(n, 3);
  for (const [k, id] of Object.entries(obj(o.sets))) if (ids.has(k) && typeof id === 'string' && UUID.test(id)) s.sets[k] = id;
  const c = obj(o.caught);
  for (const g of GHOSTS) {
    const n = num(c[g.id], 1e6);
    if (n) s.caught[g.id] = n;
  }
  s.puzzles = num(o.puzzles, 1e6);
  s.rescued = num(o.rescued, 1e6);
  s.openAll = o.openAll === true;
  return s;
}

export function loadGhost(): GhostSave {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanGhost(JSON.parse(raw)) : EMPTY_GHOST();
  } catch {
    return EMPTY_GHOST();
  }
}

export function writeGhost(s: GhostSave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
