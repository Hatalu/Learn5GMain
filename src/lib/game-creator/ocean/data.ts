/**
 * ข้อมูลและตรรกะล้วนของ Ocean Guardian AR (ไม่ใช้ DOM ทดสอบใน selftest ได้)
 * พื้นที่ใต้ทะเล 8 แห่ง บอส 5 ตัว พลังพิเศษ 6 แบบ การ์ดสัตว์ทะเล 8 ชนิด สมบัติสะสม อัปเกรด 5 ด้าน การคิดคะแนน
 * คำถามไม่อยู่ในไฟล์นี้: ทุกข้อมาจากชุดคำถามของครู (ตาราง user_games)
 * ข้อมูลสัตว์ในการ์ดเป็นความรู้ประกอบ ไม่ใช่คำถาม
 */

/* ------------------------------ บอส ------------------------------ */

export type OceanBossId = 'shark' | 'jelly' | 'kraken' | 'octopus' | 'king';
export type AtkKind = 'shield' | 'dodge';

export interface OceanBoss {
  id: OceanBossId;
  name: string;
  color: string;
  /** HP ต่อจำนวนข้อช่วงบอส */
  hpPer: number;
  atk: AtkKind[];
  /** วินาทีระหว่างการโจมตี */
  every: number;
}

export const OCEAN_BOSSES: OceanBoss[] = [
  { id: 'shark', name: 'ฉลามยักษ์', color: '#5b8bd0', hpPer: 16, atk: ['dodge', 'shield'], every: 3.1 },
  { id: 'jelly', name: 'แมงกะพรุนพิษ', color: '#c06bff', hpPer: 17, atk: ['shield', 'shield', 'dodge'], every: 2.9 },
  { id: 'kraken', name: 'คราเคน', color: '#e0566b', hpPer: 19, atk: ['dodge', 'shield', 'dodge'], every: 2.6 },
  { id: 'octopus', name: 'หมึกยักษ์ทมิฬ', color: '#4a3a8a', hpPer: 20, atk: ['shield', 'dodge'], every: 2.4 },
  { id: 'king', name: 'ราชามลพิษ', color: '#6b7a3a', hpPer: 22, atk: ['dodge', 'shield', 'shield', 'dodge'], every: 2.2 },
];
export const oceanBoss = (id: unknown) => OCEAN_BOSSES.find((b) => b.id === id) || OCEAN_BOSSES[0];

/* ------------------------------ พื้นที่ใต้ทะเล ------------------------------ */

export interface Zone {
  id: string;
  name: string;
  en: string;
  color: string;
  /** ไล่สีน้ำทะเล (โหมดไม่มีกล้อง) บน -> ล่าง */
  sky: [string, string];
  boss: OceanBossId;
  /** สีปลาในฟองคำตอบ */
  mob: string[];
}

export const ZONES: Zone[] = [
  { id: 'reef', name: 'แนวปะการัง', en: 'Coral Reef', color: '#ff8f6b', sky: ['#2fc4e8', '#0f6fb0'], boss: 'shark', mob: ['#ffb347', '#ff8fc7', '#7be36b'] },
  { id: 'deep', name: 'ทะเลลึก', en: 'Deep Ocean', color: '#2f6fd0', sky: ['#1a5fb0', '#0a2a5c'], boss: 'jelly', mob: ['#59c8ff', '#ffd23f', '#b9a3ff'] },
  { id: 'sharkv', name: 'หุบเขาฉลาม', en: 'Shark Valley', color: '#5b8bd0', sky: ['#3a8ac8', '#173f73'], boss: 'shark', mob: ['#ffc53a', '#7fe8ff', '#ff8f6b'] },
  { id: 'jellyf', name: 'ป่าแมงกะพรุน', en: 'Jellyfish Forest', color: '#c06bff', sky: ['#4a5fd0', '#2a1f6b'], boss: 'jelly', mob: ['#ff8fc7', '#9ff0d0', '#ffe38a'] },
  { id: 'ship', name: 'เรือจมใต้ทะเล', en: 'Sunken Ship', color: '#c08a3e', sky: ['#2a8aa8', '#123a52'], boss: 'octopus', mob: ['#ffd23f', '#7be36b', '#ff8fc7'] },
  { id: 'cave', name: 'ถ้ำสมบัติ', en: 'Treasure Cave', color: '#ffc53a', sky: ['#1f6f8a', '#1a2440'], boss: 'kraken', mob: ['#ffc53a', '#59c8ff', '#ff6b9a'] },
  { id: 'volcano', name: 'ภูเขาไฟใต้ทะเล', en: 'Ocean Volcano', color: '#ff6b3d', sky: ['#2a6f9a', '#4a1f2a'], boss: 'kraken', mob: ['#ffb347', '#ffe38a', '#7fe8ff'] },
  { id: 'palace', name: 'วังคริสตัลใต้ทะเล', en: 'Crystal Palace', color: '#7fe8ff', sky: ['#3fd0e8', '#3a2a8a'], boss: 'king', mob: ['#7fe8ff', '#ff8fc7', '#ffd23f'] },
];
export const zoneById = (id: unknown) => ZONES.find((z) => z.id === id) || ZONES[0];

/** พื้นที่เปิดเมื่อพื้นที่ก่อนหน้าได้อย่างน้อย 1 ดาว (ครูเปิดทั้งหมดได้) */
export function zoneOpen(stars: Record<string, number>, id: string, openAll = false): boolean {
  const i = ZONES.findIndex((z) => z.id === id);
  if (i <= 0 || openAll) return i >= 0;
  return (stars[ZONES[i - 1].id] || 0) > 0;
}
export function nextZone(stars: Record<string, number>): Zone {
  return ZONES.find((z) => !stars[z.id] && zoneOpen(stars, z.id)) || ZONES[ZONES.length - 1];
}

/* ------------------------------ สัตว์ทะเล (การ์ดสะสม) ------------------------------ */

export type AnimalId = 'turtle' | 'dolphin' | 'whale' | 'clownfish' | 'seahorse' | 'octopus' | 'shark' | 'penguin';
export interface Animal {
  id: AnimalId;
  name: string;
  en: string;
  color: string;
  /** ความรู้สั้นๆ บนการ์ด (ไม่ใช่คำถาม) */
  fact: string;
  /** ภัยที่เจอ (เหตุที่ต้องช่วย) */
  danger: string;
}
export const ANIMALS: Animal[] = [
  { id: 'turtle', name: 'เต่าทะเล', en: 'Sea Turtle', color: '#3fcf7a', fact: 'เต่าทะเลกินแมงกะพรุน และมักกินถุงพลาสติกเพราะนึกว่าเป็นอาหาร', danger: 'ติดถุงพลาสติก' },
  { id: 'dolphin', name: 'โลมา', en: 'Dolphin', color: '#59a8ff', fact: 'โลมาหายใจด้วยปอด ต้องขึ้นมาหายใจที่ผิวน้ำ', danger: 'ติดอวนประมง' },
  { id: 'whale', name: 'วาฬ', en: 'Whale', color: '#4a7bd0', fact: 'วาฬสีน้ำเงินเป็นสัตว์ที่ตัวใหญ่ที่สุดในโลก', danger: 'ติดเชือกอวน' },
  { id: 'clownfish', name: 'ปลาการ์ตูน', en: 'Clownfish', color: '#ff8f3d', fact: 'ปลาการ์ตูนอาศัยอยู่ในดอกไม้ทะเลโดยไม่โดนพิษ', danger: 'ปะการังฟอกขาว' },
  { id: 'seahorse', name: 'ม้าน้ำ', en: 'Seahorse', color: '#ffc53a', fact: 'ม้าน้ำพ่อเป็นผู้อุ้มท้องลูก', danger: 'ติดขยะลอยน้ำ' },
  { id: 'octopus', name: 'ปลาหมึกยักษ์', en: 'Octopus', color: '#ff6b9a', fact: 'ปลาหมึกยักษ์มี 8 แขน และมีหัวใจ 3 ดวง', danger: 'ติดในขวดแก้ว' },
  { id: 'shark', name: 'ฉลาม', en: 'Shark', color: '#8aa0b8', fact: 'ฉลามช่วยรักษาสมดุลของท้องทะเล ฟันหลุดแล้วงอกใหม่ได้', danger: 'ติดอวนผี' },
  { id: 'penguin', name: 'เพนกวิน', en: 'Penguin', color: '#3a4a6b', fact: 'เพนกวินบินไม่ได้ แต่ว่ายน้ำเก่งมาก', danger: 'ติดคราบน้ำมัน' },
];
export const animalById = (id: unknown) => ANIMALS.find((a) => a.id === id) || ANIMALS[0];
/** สัตว์ที่ติดอวนในการช่วยครั้งที่ k ของพื้นที่ (ยังไม่มีการ์ดได้ก่อน) */
export function rescueAnimal(zoneIdx: number, k: number, have: AnimalId[]): Animal {
  const order = ANIMALS.map((_, i) => ANIMALS[(i + zoneIdx) % ANIMALS.length]);
  const missing = order.filter((a) => !have.includes(a.id));
  const pool = missing.length ? missing : order;
  return pool[k % pool.length];
}

/* ------------------------------ ขยะ + สมบัติ ------------------------------ */

export type TrashKind = 'bag' | 'bottle' | 'can';
export const TRASH: TrashKind[] = ['bag', 'bottle', 'can'];
export type TreasureId = 'pearl' | 'shell' | 'coral' | 'crystal';
export const TREASURES: { id: TreasureId; name: string; en: string; color: string }[] = [
  { id: 'pearl', name: 'ไข่มุก', en: 'Pearl', color: '#f3eaff' },
  { id: 'shell', name: 'เปลือกหอยทองคำ', en: 'Golden Shell', color: '#ffc53a' },
  { id: 'coral', name: 'ปะการังวิเศษ', en: 'Magic Coral', color: '#ff6b9a' },
  { id: 'crystal', name: 'คริสตัลมหาสมุทร', en: 'Ocean Crystal', color: '#7fe8ff' },
];
export const treasureById = (id: unknown) => TREASURES.find((t) => t.id === id) || TREASURES[0];

/* ------------------------------ พลังพิเศษ (ปลดล็อกด้วยความรู้) ------------------------------ */

export type PowerId = 'wave' | 'shield' | 'magnet' | 'heal' | 'boost' | 'super' | 'double';
export interface Power {
  id: PowerId;
  name: string;
  en: string;
  color: string;
  need: number;
  how: string;
}
export const POWERS: Power[] = [
  { id: 'wave', name: 'คลื่นน้ำ', en: 'Water Wave', color: '#59c8ff', need: 0, how: 'ยื่นมือเล็งบอส ค้างไว้' },
  { id: 'shield', name: 'โล่ฟองอากาศ', en: 'Bubble Shield', color: '#bff3ff', need: 0, how: 'ประกบสองมือหน้าอก' },
  { id: 'magnet', name: 'แม่เหล็กมหาสมุทร', en: 'Ocean Magnet', color: '#ff6b9a', need: 5, how: 'เก็บขยะและสมบัติได้ไกลขึ้น (อัตโนมัติ)' },
  { id: 'heal', name: 'ไข่มุกฟื้นพลัง', en: 'Healing Pearl', color: '#f3eaff', need: 10, how: 'ยกสองมือเหนือหัวค้างไว้' },
  { id: 'boost', name: 'กระแสน้ำเร่ง', en: 'Water Boost', color: '#9ff0d0', need: 18, how: 'กางแขนออกข้างเป็นตัว T' },
  { id: 'super', name: 'คลื่นยักษ์', en: 'Super Wave', color: '#2f6fd0', need: 28, how: 'ยื่นสองมือเล็งจุดเดียวกัน' },
  { id: 'double', name: 'เหรียญสองเท่า', en: 'Double Score', color: '#ffd23f', need: 40, how: 'เหรียญรางวัลท้ายรอบ x2 (อัตโนมัติ)' },
];
export const powerById = (id: unknown) => POWERS.find((p) => p.id === id) || POWERS[0];
export const openPowers = (knowledge: number) => POWERS.filter((p) => knowledge >= p.need).map((p) => p.id);
export const nextPower = (knowledge: number) => POWERS.filter((p) => knowledge < p.need).sort((a, b) => a.need - b.need)[0] || null;

/** ความเสียหายต่อบอส (ก่อนคูณพลัง) */
export const POWER_DMG: Partial<Record<PowerId, number>> = { wave: 10, boost: 16, super: 26 };
export function waveDamage(id: PowerId, power: number, combo = 0): number {
  const base = POWER_DMG[id] || 0;
  return Math.round(base * power * (1 + Math.min(combo, 5) * 0.05));
}

/* ------------------------------ ตัวละคร ------------------------------ */

export interface Look {
  /** 0 = ชาย, 1 = หญิง */
  g: 0 | 1;
  suit: number;
  skin: number;
  /** 0 หน้ากากดำน้ำ / 1 หมวกดำน้ำโดม / 2 มงกุฎเปลือกหอย */
  gear: number;
  fin: number;
}
export const SUITS = ['#2f8ae8', '#ff6b9a', '#3fcf7a', '#ffb347', '#7a5cff', '#1f3f6b'];
export const FINS = ['#ffd23f', '#ff6b3d', '#7fe8ff', '#ff8fc7', '#9ff0d0'];
export const SKINS = ['#ffe0c2', '#f5c99b', '#d9a06b', '#a8714a'];
export const GEARS = ['หน้ากากดำน้ำ', 'หมวกดำน้ำโดม', 'มงกุฎเปลือกหอย'];
export const DEFAULT_LOOK: Look = { g: 0, suit: 0, skin: 0, gear: 0, fin: 0 };
const idx = (v: unknown, n: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : 0);
export function cleanLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { g: o.g === 1 ? 1 : 0, suit: idx(o.suit, SUITS.length), skin: idx(o.skin, SKINS.length), gear: idx(o.gear, GEARS.length), fin: idx(o.fin, FINS.length) };
}

/* ------------------------------ อัปเกรด ------------------------------ */

export type SkillId = 'power' | 'defense' | 'energy' | 'speed' | 'knowledge';
export const SKILLS: { id: SkillId; name: string; desc: string; color: string }[] = [
  { id: 'power', name: 'Wave Power', desc: 'คลื่นน้ำแรงขึ้น +12% ต่อขั้น', color: '#2f8ae8' },
  { id: 'defense', name: 'Bubble Armor', desc: 'โล่ฟองอยู่นานขึ้น โดนตีเบาลง', color: '#7fe8ff' },
  { id: 'energy', name: 'Oxygen Tank', desc: 'ได้ลูกคลื่นต่อข้อมากขึ้น', color: '#3fcf7a' },
  { id: 'speed', name: 'Fast Fins', desc: 'ล็อกเป้าเร็วขึ้น', color: '#ffb347' },
  { id: 'knowledge', name: 'Ocean Wisdom', desc: 'ความรู้ +1 ต่อข้อที่ถูก (ปลดพลังไวขึ้น)', color: '#ffd23f' },
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
  hurt: number;
  /** ลูกคลื่นต่อข้อที่ตอบถูก (ช่วงสู้บอส) */
  bolts: number;
  dwell: number;
  know: number;
  hearts: number;
  /** รัศมีเก็บของ (คูณ) */
  reach: number;
  coin: number;
}
export function effects(s: Skills, open: PowerId[]): Effects {
  return {
    power: 1 + s.power * 0.12,
    hurt: Math.max(0.4, 1 - s.defense * 0.12),
    bolts: 3 + Math.floor(s.energy / 2),
    dwell: 850 - s.speed * 60,
    know: 1 + (s.knowledge >= 3 ? 1 : 0) + (s.knowledge >= SKILL_MAX ? 1 : 0),
    hearts: 3,
    reach: open.includes('magnet') ? 2 : 1.4,
    coin: open.includes('double') ? 2 : 1,
  };
}

/* ------------------------------ ภารกิจต่อข้อ + คะแนน ------------------------------ */

/** คะแนนความรู้ (ตอบคำถาม) แยกจากคะแนนการเล่น: ขยะ 10 สมบัติ 20 ช่วยสัตว์ 50 ฟื้นปะการัง 50 บอส 100 ภารกิจทีม 100 */
export const OG_POINTS = { correct: 100, retry: 50, speedMax: 20, comboStep: 10, comboMax: 50, trash: 10, treasure: 20, rescue: 50, coral: 50, dodge: 10, hit: 5, block: 5, boss: 100, team: 100 } as const;

export function answerPoints(firstTry: boolean, usedMs: number, limitMs: number, streak: number): number {
  if (!firstTry) return OG_POINTS.retry;
  const left = limitMs > 0 ? Math.max(0, 1 - usedMs / limitMs) : 0;
  const combo = Math.min(OG_POINTS.comboMax, Math.max(0, streak - 1) * OG_POINTS.comboStep);
  return OG_POINTS.correct + Math.round(OG_POINTS.speedMax * left) + combo;
}

/** ภารกิจพิเศษของข้อที่ n: ช่วยสัตว์ (ทุกข้อที่ 3) / ฟื้นปะการัง (ข้อที่ 2, 5, 8...) / ไม่มี */
export type Special = 'rescue' | 'coral' | null;
export const specialOf = (n: number): Special => (n % 3 === 2 ? 'rescue' : n % 3 === 1 ? 'coral' : null);
/** รอบหลังตอบถูก: เก็บขยะ (ข้อคู่) / ว่ายหลบสิ่งกีดขวาง (ข้อคี่) */
export type Round = 'trash' | 'swim';
export const roundOf = (n: number): Round => (n % 2 === 0 ? 'trash' : 'swim');
/** ของในรอบเก็บขยะ 3 ชิ้น หีบสมบัติ 1 ใบเฉพาะข้อที่ไม่มีภารกิจพิเศษ / สิ่งกีดขวางรอบว่าย 3 อัน */
export const TRASH_PER = 3;
export const OBSTACLES_PER = 3;
export const hasChest = (n: number) => specialOf(n) === null;

/** คะแนนการเล่นสูงสุดที่ได้จากข้อที่ n (ไม่นับบอส) ต้องน้อยกว่าคะแนนตอบถูกครั้งแรก 100 เสมอ */
export function maxPlayFor(n: number): number {
  const round = roundOf(n) === 'trash' ? (hasChest(n) ? (TRASH_PER - 1) * OG_POINTS.trash + OG_POINTS.treasure : TRASH_PER * OG_POINTS.trash) : OBSTACLES_PER * OG_POINTS.dodge;
  const sp = specialOf(n);
  return round + (sp === 'rescue' ? OG_POINTS.rescue : sp === 'coral' ? OG_POINTS.coral : 0);
}
/** คะแนนการเล่นสูงสุดในรอบสู้บอสหนึ่งรอบ (ไม่นับโบนัสล้มบอสครั้งเดียว): ลูกคลื่นทุกลูก + กันทุกการโจมตี */
export function maxBattlePlay(fx: Effects, battleS: number, minEvery: number): number {
  const shots = fx.bolts + 1 /* คอมโบ 3 */ + 1; /* ชาร์จ */
  const atks = Math.ceil(battleS / minEvery);
  return shots * OG_POINTS.hit + atks * OG_POINTS.block;
}

export function zoneStars(firstCorrect: number, total: number): number {
  if (!total || !firstCorrect) return 0;
  const r = firstCorrect / total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}
export const coinsFor = (score: number, stars: number, coin: number) => Math.round((score / 10 + stars * 15) * coin);
/** ปะการังที่ฟื้นได้ (%) = ข้อที่ตอบถูก / ทั้งหมด */
export const reefPct = (correct: number, total: number) => (total ? Math.round((Math.min(correct, total) / total) * 100) : 0);

/** HP บอส (สูตรเดียวกับ Magic Kingdom: ลูกคลื่น 3 ลูก x 10 ต่อข้อ x ความยาก x ความอึด) */
export const bossHpFor = (b: OceanBoss, bossQs: number, level: number) => Math.max(20, Math.round(Math.max(1, bossQs) * 30 * ([0.6, 0.8, 1][level] ?? 0.8) * (b.hpPer / 20)));
export function bossStart(total: number): number {
  if (total <= 2) return total - 1;
  return total - Math.max(2, Math.round(total * 0.4));
}
export function pickAtk(b: OceanBoss, prev: AtkKind[], rnd = Math.random): AtkKind {
  let k = b.atk[Math.floor(rnd() * b.atk.length)];
  if (prev.length >= 2 && prev[prev.length - 1] === k && prev[prev.length - 2] === k) k = k === 'dodge' ? 'shield' : 'dodge';
  return k;
}
