/**
 * ข้อมูลและตรรกะล้วนของ Magic Kingdom AR (ไม่ใช้ DOM ทดสอบใน selftest ได้)
 * ดินแดน 6 แห่ง บอสประจำดินแดน เวทมนตร์ 7 แบบ สัตว์เลี้ยง 5 ตัว อัปเกรด 5 ด้าน การคิดคะแนน
 * คำถามไม่อยู่ในไฟล์นี้: ทุกข้อมาจากชุดคำถามของครู (ตาราง user_games)
 */

/* ------------------------------ ดินแดน + บอส ------------------------------ */

export type BossId = 'golem' | 'shadow' | 'giant' | 'dragon' | 'wizard' | 'king';
export type AtkKind = 'shield' | 'dodge';

export interface MagicBoss {
  id: BossId;
  name: string;
  color: string;
  /** HP ต่อจำนวนข้อของดินแดน */
  hpPer: number;
  /** ท่าโจมตีที่ใช้ (สุ่มตามน้ำหนัก) */
  atk: AtkKind[];
  /** วินาทีระหว่างการโจมตีในช่วงร่ายเวท */
  every: number;
}

export const MAGIC_BOSSES: MagicBoss[] = [
  { id: 'golem', name: 'โกเลมคริสตัล', color: '#9b7bff', hpPer: 16, atk: ['shield'], every: 3.2 },
  { id: 'shadow', name: 'ปีศาจเงา', color: '#5b4a9a', hpPer: 17, atk: ['dodge', 'shield'], every: 2.9 },
  { id: 'giant', name: 'ยักษ์น้ำแข็ง', color: '#59c8ff', hpPer: 18, atk: ['shield', 'shield', 'dodge'], every: 2.8 },
  { id: 'dragon', name: 'มังกรเพลิง', color: '#ff6b3d', hpPer: 19, atk: ['dodge', 'dodge', 'shield'], every: 2.6 },
  { id: 'wizard', name: 'พ่อมดมืด', color: '#b85cff', hpPer: 20, atk: ['dodge', 'shield'], every: 2.4 },
  { id: 'king', name: 'ราชาแห่งความมืด', color: '#3a2a6b', hpPer: 22, atk: ['dodge', 'shield', 'shield', 'dodge'], every: 2.2 },
];
export const magicBoss = (id: unknown) => MAGIC_BOSSES.find((b) => b.id === id) || MAGIC_BOSSES[0];

export interface Land {
  id: string;
  name: string;
  en: string;
  color: string;
  /** ไล่สีท้องฟ้า (โหมดไม่มีกล้อง) */
  sky: [string, string];
  boss: BossId;
  /** สีมอนสเตอร์ตัวเล็กในดินแดน */
  mob: string[];
  /** ธาตุของดินแดน (ภารกิจธาตุ) */
  element: 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';
}

export const LANDS: Land[] = [
  { id: 'castle', name: 'ปราสาทเวทมนตร์', en: 'Magic Castle', color: '#9b7bff', sky: ['#6d5bff', '#ffb3e6'], boss: 'golem', mob: ['#ff8fc7', '#9b7bff', '#7fd8ff'], element: 'light' },
  { id: 'forest', name: 'ป่ามหัศจรรย์', en: 'Enchanted Forest', color: '#3fcf7a', sky: ['#1f8a6a', '#bff5a8'], boss: 'shadow', mob: ['#7be36b', '#ffd23f', '#3fcf9a'], element: 'earth' },
  { id: 'ice', name: 'อาณาจักรน้ำแข็ง', en: 'Ice Kingdom', color: '#59c8ff', sky: ['#3a7bd5', '#e0f7ff'], boss: 'giant', mob: ['#a8e8ff', '#ffffff', '#8fb8ff'], element: 'water' },
  { id: 'volcano', name: 'ภูเขาไฟแห่งเพลิง', en: 'Fire Volcano', color: '#ff6b3d', sky: ['#7a1f3a', '#ffb347'], boss: 'dragon', mob: ['#ff6b3d', '#ffc53a', '#ff8f6b'], element: 'fire' },
  { id: 'sky', name: 'เกาะลอยฟ้า', en: 'Sky Island', color: '#ffc53a', sky: ['#4fb3ff', '#fff3c4'], boss: 'wizard', mob: ['#ffffff', '#ffe38a', '#bfe9ff'], element: 'wind' },
  { id: 'dark', name: 'มิติแห่งความมืด', en: 'Dark Dimension', color: '#5b3f9a', sky: ['#120c3a', '#5b3f9a'], boss: 'king', mob: ['#7a5cc8', '#ff6b9a', '#4a3a8a'], element: 'dark' },
];
export const landById = (id: unknown) => LANDS.find((l) => l.id === id) || LANDS[0];

/** ดินแดนเปิดเมื่อดินแดนก่อนหน้าได้อย่างน้อย 1 ดาว (ครูเปิดทั้งหมดได้) */
export function landOpen(stars: Record<string, number>, id: string, openAll = false): boolean {
  const i = LANDS.findIndex((l) => l.id === id);
  if (i <= 0 || openAll) return i >= 0;
  return (stars[LANDS[i - 1].id] || 0) > 0;
}
/** ดินแดนถัดไปที่ควรเล่น (ยังไม่ได้ดาวและเปิดแล้ว) */
export function nextLand(stars: Record<string, number>): Land {
  return LANDS.find((l) => !stars[l.id] && landOpen(stars, l.id)) || LANDS[LANDS.length - 1];
}

/* ------------------------------ เวทมนตร์ ------------------------------ */

export type SpellId = 'fire' | 'ice' | 'thunder' | 'wind' | 'earth' | 'heal' | 'rainbow';

export interface Spell {
  id: SpellId;
  name: string;
  en: string;
  color: string;
  /** ความรู้ (จำนวนข้อที่ตอบถูกสะสม) ที่ต้องมีถึงปลดล็อก */
  need: number;
  /** ท่าที่ใช้ร่าย */
  how: string;
}

export const SPELLS: Spell[] = [
  { id: 'fire', name: 'ลูกไฟ', en: 'Fireball', color: '#ff7a3d', need: 0, how: 'ยื่นมือเล็งบอส ค้างไว้' },
  { id: 'earth', name: 'โล่ศิลา', en: 'Earth Shield', color: '#c08a3e', need: 0, how: 'ประกบสองมือหน้าอก' },
  { id: 'ice', name: 'ระเบิดน้ำแข็ง', en: 'Ice Blast', color: '#59c8ff', need: 5, how: 'ยื่นมือเล็ง (เลือกที่ไม้เท้า)' },
  { id: 'heal', name: 'แสงฟื้นพลัง', en: 'Healing Light', color: '#7be36b', need: 10, how: 'ยกสองมือเหนือหัวค้างไว้' },
  { id: 'thunder', name: 'สายฟ้าฟาด', en: 'Thunder Strike', color: '#ffd23f', need: 18, how: 'ยื่นมือเล็ง (เลือกที่ไม้เท้า)' },
  { id: 'wind', name: 'พายุหมุน', en: 'Wind Tornado', color: '#9ff0d0', need: 28, how: 'กางแขนออกข้างเป็นตัว T' },
  { id: 'rainbow', name: 'ลำแสงสายรุ้ง', en: 'Rainbow Beam', color: '#ff8fc7', need: 40, how: 'ยื่นสองมือเล็งจุดเดียวกัน' },
];
export const spellById = (id: unknown) => SPELLS.find((s) => s.id === id) || SPELLS[0];
/** เวทโจมตีหลักที่เลือกใส่ไม้เท้าได้ */
export const BOLT_SPELLS: SpellId[] = ['fire', 'ice', 'thunder'];

export const spellOpen = (knowledge: number, id: SpellId) => knowledge >= spellById(id).need;
export const openSpells = (knowledge: number) => SPELLS.filter((s) => knowledge >= s.need).map((s) => s.id);
/** เวทถัดไปที่จะปลดล็อก (ไม่มีแล้ว = null) */
export const nextSpell = (knowledge: number) => SPELLS.filter((s) => knowledge < s.need).sort((a, b) => a.need - b.need)[0] || null;

/* ------------------------------ ความเสียหาย ------------------------------ */

export interface DmgFx {
  /** ตัวคูณจากอัปเกรด/สัตว์เลี้ยง */
  power: number;
}

/** ความเสียหายต่อบอสของเวทแต่ละแบบ (ก่อนคูณพลัง) */
export const SPELL_DMG: Record<SpellId, number> = { fire: 10, ice: 9, thunder: 14, wind: 18, earth: 0, heal: 0, rainbow: 26 };

export function spellDamage(id: SpellId, fx: DmgFx, combo = 0): number {
  const base = SPELL_DMG[id];
  if (!base) return 0;
  return Math.round(base * fx.power * (1 + Math.min(combo, 5) * 0.05));
}

/** น้ำแข็งแช่แข็งบอส (เลื่อนการโจมตีครั้งต่อไป) วินาที */
export const FREEZE_S = 2.5;

/* ------------------------------ สัตว์เลี้ยง ------------------------------ */

export type PetId = 'cat' | 'dragon' | 'fairy' | 'phoenix' | 'unicorn';
export interface Pet {
  id: PetId;
  name: string;
  color: string;
  bonus: string;
  /** ราคาเหรียญ (0 = มีตั้งแต่แรก) */
  cost: number;
}
export const PETS: Pet[] = [
  { id: 'cat', name: 'แมวเวทมนตร์', color: '#ffb347', bonus: 'เหรียญ +20%', cost: 0 },
  { id: 'fairy', name: 'นางฟ้าจิ๋ว', color: '#ff8fc7', bonus: 'ฟื้นหัวใจเมื่อตอบถูก 3 ข้อติด', cost: 120 },
  { id: 'dragon', name: 'มังกรน้อย', color: '#3fcf7a', bonus: 'พลังเวท +20%', cost: 200 },
  { id: 'unicorn', name: 'ยูนิคอร์น', color: '#b9a3ff', bonus: 'ล็อกเป้าเร็วขึ้น', cost: 260 },
  { id: 'phoenix', name: 'ฟีนิกซ์', color: '#ff6b3d', bonus: 'หัวใจ +1', cost: 340 },
];
export const petById = (id: unknown) => PETS.find((p) => p.id === id) || PETS[0];

/* ------------------------------ ตัวละคร ------------------------------ */

export interface Look {
  /** 0 = นักเวทชาย, 1 = นักเวทหญิง */
  g: 0 | 1;
  robe: number;
  hat: number;
  staff: number;
  /** สีพลังเวท */
  aura: number;
  skin: number;
}
export const ROBES = ['#6d5bff', '#ff6b9a', '#3fcf7a', '#2fb8ff', '#ff9a3d', '#3a2a6b'];
export const AURAS = ['#ffd23f', '#7fe8ff', '#ff8fc7', '#9ff0d0', '#c39bff', '#ff7a3d'];
export const SKINS = ['#ffe0c2', '#f5c99b', '#d9a06b', '#a8714a'];
export const HATS = ['หมวกแหลม', 'หมวกดาว', 'มงกุฎเวท'];
export const STAVES = ['ไม้เท้าดาว', 'ไม้เท้าคริสตัล', 'ไม้เท้าพระจันทร์'];
export const DEFAULT_LOOK: Look = { g: 0, robe: 0, hat: 0, staff: 0, aura: 0, skin: 0 };

const idx = (v: unknown, n: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : 0);
export function cleanLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { g: o.g === 1 ? 1 : 0, robe: idx(o.robe, ROBES.length), hat: idx(o.hat, HATS.length), staff: idx(o.staff, STAVES.length), aura: idx(o.aura, AURAS.length), skin: idx(o.skin, SKINS.length) };
}

/* ------------------------------ อัปเกรด ------------------------------ */

export type SkillId = 'power' | 'defense' | 'energy' | 'speed' | 'knowledge';
export const SKILLS: { id: SkillId; name: string; desc: string; color: string }[] = [
  { id: 'power', name: 'Magic Power', desc: 'พลังโจมตีเวท +12% ต่อขั้น', color: '#ff7a3d' },
  { id: 'defense', name: 'Defense', desc: 'โล่กันได้นานขึ้น โดนตีเบาลง', color: '#c08a3e' },
  { id: 'energy', name: 'Energy', desc: 'ได้ลูกเวทต่อข้อมากขึ้น', color: '#2fb8ff' },
  { id: 'speed', name: 'Speed', desc: 'ล็อกเป้าเร็วขึ้น', color: '#3fcf7a' },
  { id: 'knowledge', name: 'Knowledge', desc: 'ความรู้ +1 ต่อข้อที่ถูก (ปลดเวทไวขึ้น)', color: '#ffc53a' },
];
export const SKILL_MAX = 5;
export type Skills = Record<SkillId, number>;
export const NO_SKILLS: Skills = { power: 0, defense: 0, energy: 0, speed: 0, knowledge: 0 };
export const skillCost = (lv: number) => 60 + lv * 50;

export function cleanSkills(v: unknown): Skills {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = { ...NO_SKILLS };
  for (const k of Object.keys(s) as SkillId[]) s[k] = Math.max(0, Math.min(SKILL_MAX, Math.floor(Number(o[k]) || 0)));
  return s;
}

export interface Effects {
  power: number;
  /** ตัวคูณความเสียหายที่โดน */
  hurt: number;
  /** ลูกเวทต่อข้อที่ตอบถูก (ช่วงโจมตีบอส) */
  bolts: number;
  /** เวลาล็อกเป้า (ms) */
  dwell: number;
  /** ความรู้ต่อข้อถูก */
  know: number;
  hearts: number;
  coin: number;
}

export function effects(s: Skills, pet: PetId): Effects {
  return {
    power: (1 + s.power * 0.12) * (pet === 'dragon' ? 1.2 : 1),
    hurt: Math.max(0.4, 1 - s.defense * 0.12),
    bolts: 3 + Math.floor(s.energy / 2),
    dwell: Math.round((850 - s.speed * 60) * (pet === 'unicorn' ? 0.85 : 1)),
    know: 1 + (s.knowledge >= 3 ? 1 : 0) + (s.knowledge >= SKILL_MAX ? 1 : 0),
    hearts: 3 + (pet === 'phoenix' ? 1 : 0),
    coin: pet === 'cat' ? 1.2 : 1,
  };
}

/* ------------------------------ คะแนน ------------------------------ */

/** คะแนนความรู้ (ตอบคำถาม) แยกจากคะแนนการเล่น (เวท/คริสตัล/ช่วยชาวเมือง/บอส) */
export const MK_POINTS = { correct: 100, retry: 50, speedMax: 20, comboStep: 10, comboMax: 50, hit: 10, crystal: 20, rescue: 50, boss: 100, team: 100 } as const;

/** ตอบถูกครั้งแรก 100 + ไวสูงสุด 20 + คอมโบ (ข้อติดกันที่ 2 ขึ้นไป +10 ต่อข้อ สูงสุด 50) / ถูกหลังตอบผิด 50 */
export function answerPoints(firstTry: boolean, usedMs: number, limitMs: number, streak: number): number {
  if (!firstTry) return MK_POINTS.retry;
  const left = limitMs > 0 ? Math.max(0, 1 - usedMs / limitMs) : 0;
  const combo = Math.min(MK_POINTS.comboMax, Math.max(0, streak - 1) * MK_POINTS.comboStep);
  return MK_POINTS.correct + Math.round(MK_POINTS.speedMax * left) + combo;
}

/** ดาวของดินแดน: ถูกครั้งแรก >= 90% = 3, >= 60% = 2, อย่างน้อย 1 ข้อ = 1 */
export function landStars(firstCorrect: number, total: number): number {
  if (!total || !firstCorrect) return 0;
  const r = firstCorrect / total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}

/** เหรียญที่ได้จากรอบเล่น (คะแนนรวม / 10 คูณโบนัสแมว + ดาว) */
export const coinsFor = (score: number, stars: number, coin: number) => Math.round((score / 10) * coin) + stars * 15;

/** ข้อไหนเป็นข้อช่วยชาวเมือง (ทุกข้อที่ 3) */
export const isRescue = (i: number) => i % 3 === 2;

/**
 * HP บอส = จำนวนข้อช่วงบอส x ลูกเวท 3 ลูก x ลูกไฟ 10 x ตัวคูณความยาก x ความอึดของบอส
 * ดินแดนแรกๆ ตอบถูกราว 80% ก็ล้มบอสได้ ดินแดนท้ายๆ ต้องตอบถูกเกือบหมดหรืออัปเกรดพลังเวท ถ้าข้อหมดก่อน คริสตัลแห่งความรู้ปิดฉากให้ (ไม่มีแพ้)
 */
export const bossHpFor = (b: MagicBoss, bossQs: number, level: number) => Math.max(20, Math.round(Math.max(1, bossQs) * 30 * ([0.6, 0.8, 1][level] ?? 0.8) * (b.hpPer / 20)));

/** แบ่งข้อ: ช่วงผจญภัย / ช่วงบอส (40% ท้าย อย่างน้อย 2 ข้อ ถ้ามีข้อพอ) */
export function bossStart(total: number): number {
  if (total <= 2) return total - 1;
  return total - Math.max(2, Math.round(total * 0.4));
}

/** สุ่มท่าโจมตีบอส (ซ้ำท่าเดิมได้ไม่เกิน 2 ครั้งติด) */
export function pickAtk(b: MagicBoss, prev: AtkKind[], rnd = Math.random): AtkKind {
  let k = b.atk[Math.floor(rnd() * b.atk.length)];
  if (prev.length >= 2 && prev[prev.length - 1] === k && prev[prev.length - 2] === k) k = k === 'dodge' ? 'shield' : 'dodge';
  return k;
}
