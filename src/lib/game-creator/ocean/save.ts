/**
 * ข้อมูลสะสมของ Ocean Guardian AR เก็บในเครื่องนี้ (localStorage) ไม่ต้องล็อกอิน ไม่ส่งขึ้นเซิร์ฟเวอร์
 * เหรียญ ความรู้ (ปลดพลัง) อัปเกรด ตัวละคร ดาว/ปะการังแต่ละพื้นที่ การ์ดสัตว์ทะเล สมบัติ ชุดคำถามที่ครูผูกกับพื้นที่
 */
import { ANIMALS, DEFAULT_LOOK, NO_SKILLS, TREASURES, ZONES, cleanLook, cleanSkills, type AnimalId, type Look, type Skills, type TreasureId } from './data';

const KEY = 'l5g_ocean_v1';

export interface OceanSave {
  coins: number;
  knowledge: number;
  skills: Skills;
  look: Look;
  stars: Record<string, number>;
  /** ปะการังที่ฟื้นได้สูงสุดของแต่ละพื้นที่ (%) */
  reef: Record<string, number>;
  /** การ์ดสัตว์ทะเลที่ช่วยได้แล้ว */
  cards: AnimalId[];
  items: Record<TreasureId, number>;
  trash: number;
  rescued: number;
  sets: Record<string, string>;
  openAll: boolean;
}

const NO_ITEMS = (): Record<TreasureId, number> => ({ pearl: 0, shell: 0, coral: 0, crystal: 0 });
export const EMPTY_OCEAN = (): OceanSave => ({ coins: 0, knowledge: 0, skills: { ...NO_SKILLS }, look: { ...DEFAULT_LOOK }, stars: {}, reef: {}, cards: [], items: NO_ITEMS(), trash: 0, rescued: 0, sets: {}, openAll: false });

const UUID = /^[0-9a-f-]{36}$/i;
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const obj = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;

export function cleanOcean(v: unknown): OceanSave {
  const o = obj(v);
  const s = EMPTY_OCEAN();
  s.coins = num(o.coins, 1e6);
  s.knowledge = num(o.knowledge, 1e6);
  s.skills = cleanSkills(o.skills);
  s.look = cleanLook(o.look);
  const ids = new Set(ZONES.map((z) => z.id));
  for (const [k, n] of Object.entries(obj(o.stars))) if (ids.has(k)) s.stars[k] = num(n, 3);
  for (const [k, n] of Object.entries(obj(o.reef))) if (ids.has(k)) s.reef[k] = num(n, 100);
  for (const [k, id] of Object.entries(obj(o.sets))) if (ids.has(k) && typeof id === 'string' && UUID.test(id)) s.sets[k] = id;
  const an = new Set(ANIMALS.map((a) => a.id));
  s.cards = Array.isArray(o.cards) ? [...new Set(o.cards.filter((a): a is AnimalId => an.has(a as AnimalId)))] : [];
  const it = obj(o.items);
  for (const t of TREASURES) s.items[t.id] = num(it[t.id], 1e6);
  s.trash = num(o.trash, 1e7);
  s.rescued = num(o.rescued, 1e6);
  s.openAll = o.openAll === true;
  return s;
}

export function loadOcean(): OceanSave {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanOcean(JSON.parse(raw)) : EMPTY_OCEAN();
  } catch {
    return EMPTY_OCEAN();
  }
}

export function writeOcean(s: OceanSave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
