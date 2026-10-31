/**
 * ข้อมูลสะสมของ Magic Kingdom AR เก็บในเครื่องนี้ (localStorage) ไม่ต้องล็อกอิน ไม่ส่งขึ้นเซิร์ฟเวอร์
 * เหรียญ ความรู้ (ปลดเวท) อัปเกรด สัตว์เลี้ยง ตัวละคร ดาวแต่ละดินแดน ชุดคำถามที่ครูผูกกับดินแดน
 * อ่าน/เขียนพังได้ (โหมดส่วนตัว/ปิด storage) = เล่นได้ปกติแต่ไม่จำ
 */
import { BOLT_SPELLS, DEFAULT_LOOK, LANDS, PETS, cleanLook, cleanSkills, NO_SKILLS, type Look, type PetId, type Skills, type SpellId } from './data';

const KEY = 'l5g_magic_v1';

export interface MagicSave {
  coins: number;
  /** ความรู้สะสม = ข้อที่ตอบถูก (+โบนัสอัปเกรด) ใช้ปลดล็อกเวท */
  knowledge: number;
  skills: Skills;
  pets: PetId[];
  pet: PetId;
  look: Look;
  /** เวทโจมตีที่ใส่ไม้เท้า */
  bolt: SpellId;
  stars: Record<string, number>;
  /** ดินแดน -> id ชุดคำถาม (ครูกำหนด) */
  sets: Record<string, string>;
  openAll: boolean;
  /** ปลดปล่อยชาวเมืองสะสม / คริสตัลสะสม */
  rescued: number;
  crystals: number;
}

export const EMPTY_MAGIC = (): MagicSave => ({ coins: 0, knowledge: 0, skills: { ...NO_SKILLS }, pets: ['cat'], pet: 'cat', look: { ...DEFAULT_LOOK }, bolt: 'fire', stars: {}, sets: {}, openAll: false, rescued: 0, crystals: 0 });

const UUID = /^[0-9a-f-]{36}$/i;
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

export function cleanMagic(v: unknown): MagicSave {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = EMPTY_MAGIC();
  s.coins = num(o.coins, 1e6);
  s.knowledge = num(o.knowledge, 1e6);
  s.skills = cleanSkills(o.skills);
  const petIds = new Set(PETS.map((p) => p.id));
  s.pets = Array.isArray(o.pets) ? [...new Set(['cat', ...o.pets.filter((p): p is PetId => petIds.has(p as PetId))])] as PetId[] : ['cat'];
  s.pet = s.pets.includes(o.pet as PetId) ? (o.pet as PetId) : 'cat';
  s.look = cleanLook(o.look);
  s.bolt = BOLT_SPELLS.includes(o.bolt as SpellId) ? (o.bolt as SpellId) : 'fire';
  const ids = new Set(LANDS.map((l) => l.id));
  const stars = (o.stars && typeof o.stars === 'object' ? o.stars : {}) as Record<string, unknown>;
  for (const [k, n] of Object.entries(stars)) if (ids.has(k)) s.stars[k] = num(n, 3);
  const sets = (o.sets && typeof o.sets === 'object' ? o.sets : {}) as Record<string, unknown>;
  for (const [k, id] of Object.entries(sets)) if (ids.has(k) && typeof id === 'string' && UUID.test(id)) s.sets[k] = id;
  s.openAll = o.openAll === true;
  s.rescued = num(o.rescued, 1e6);
  s.crystals = num(o.crystals, 1e7);
  return s;
}

export function loadMagic(): MagicSave {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanMagic(JSON.parse(raw)) : EMPTY_MAGIC();
  } catch {
    return EMPTY_MAGIC();
  }
}

export function writeMagic(s: MagicSave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
