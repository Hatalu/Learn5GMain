/**
 * ข้อมูลและตรรกะล้วนของ Ghost Hunter AR (ไม่ใช้ DOM ทดสอบใน selftest ได้)
 * สถานที่ลึกลับ 8 แห่ง บอส 5 ตัว ผีน่ารักสะสม 9 ชนิด อุปกรณ์นักล่าผี 8 ชิ้น (ปลดด้วยความรู้) เลเวลนักล่า อัปเกรด การคิดคะแนน
 * ผีทุกตัวน่ารัก ตลก เป็นมิตร ไม่มีภาพน่ากลัวหรือรุนแรง: จับผี = ดูดเข้าเครื่องแล้วเก็บเป็นการ์ด
 * คำถามไม่อยู่ในไฟล์นี้: ทุกข้อมาจากชุดคำถามของครู (ตาราง user_games)
 */

/* ------------------------------ บอส ------------------------------ */

export type GhostBossId = 'giant' | 'shadow' | 'wizard' | 'king' | 'lord';
export type AtkKind = 'shield' | 'dodge';

export interface GhostBoss {
  id: GhostBossId;
  name: string;
  color: string;
  hpPer: number;
  atk: AtkKind[];
  every: number;
}
export const GHOST_BOSSES: GhostBoss[] = [
  { id: 'giant', name: 'ผียักษ์ใจดี', color: '#9fd8ff', hpPer: 16, atk: ['shield', 'dodge'], every: 3.1 },
  { id: 'shadow', name: 'มอนสเตอร์เงา', color: '#5b4a9a', hpPer: 17, atk: ['dodge', 'dodge', 'shield'], every: 2.9 },
  { id: 'wizard', name: 'พ่อมดผีหลอน', color: '#b85cff', hpPer: 19, atk: ['shield', 'dodge'], every: 2.6 },
  { id: 'king', name: 'ราชาผีสิง', color: '#ffc53a', hpPer: 20, atk: ['dodge', 'shield', 'shield'], every: 2.4 },
  { id: 'lord', name: 'จอมผีลอร์ด', color: '#3fe0a0', hpPer: 22, atk: ['dodge', 'shield', 'shield', 'dodge'], every: 2.2 },
];
export const ghostBoss = (id: unknown) => GHOST_BOSSES.find((b) => b.id === id) || GHOST_BOSSES[0];

/* ------------------------------ ผีสะสม ------------------------------ */

export type GhostId = 'baby' | 'pumpkin' | 'friendly' | 'school' | 'library' | 'candy' | 'shadow' | 'giant' | 'king';
export type Rarity = 0 | 1 | 2 | 3;
export const RARITY = [
  { name: 'ธรรมดา', color: '#9fb3c8' },
  { name: 'หายาก', color: '#59c8ff' },
  { name: 'หายากมาก', color: '#b85cff' },
  { name: 'ตำนาน', color: '#ffc53a' },
];
export interface Ghost {
  id: GhostId;
  name: string;
  en: string;
  color: string;
  rarity: Rarity;
  /** ความสามารถ/นิสัย (ข้อความบนการ์ด ไม่ใช่คำถาม) */
  info: string;
}
export const GHOSTS: Ghost[] = [
  { id: 'baby', name: 'ผีเบบี๋', en: 'Baby Ghost', color: '#eef2ff', rarity: 0, info: 'ชอบเล่นซ่อนแอบ หัวเราะคิกคักเวลาโดนไฟฉายส่อง' },
  { id: 'pumpkin', name: 'ผีฟักทอง', en: 'Pumpkin Ghost', color: '#ff9a3d', rarity: 0, info: 'ปลูกฟักทองเก่ง แสงในหัวสว่างตอนดีใจ' },
  { id: 'friendly', name: 'ผีใจดี', en: 'Friendly Ghost', color: '#9ff0d0', rarity: 0, info: 'ชอบช่วยหาของหาย ทักทายทุกคนที่เดินผ่าน' },
  { id: 'school', name: 'ผีโรงเรียน', en: 'School Ghost', color: '#7fb8ff', rarity: 1, info: 'จำตารางเรียนได้ทุกห้อง ชอบเขียนกระดานตอนกลางคืน' },
  { id: 'library', name: 'ผีห้องสมุด', en: 'Library Ghost', color: '#c8a3ff', rarity: 1, info: 'อ่านหนังสือครบทุกเล่ม กระซิบเบาๆ ว่า "เงียบนะ"' },
  { id: 'candy', name: 'ผีขนมหวาน', en: 'Candy Ghost', color: '#ff8fc7', rarity: 1, info: 'ตัวหอมกลิ่นลูกอม แบ่งขนมให้เพื่อนเสมอ' },
  { id: 'shadow', name: 'ผีเงา', en: 'Shadow Ghost', color: '#6b5bb8', rarity: 2, info: 'ซ่อนในเงาได้เก่งที่สุด ต้องใช้ไฟฉายแรงๆ ถึงจะเจอ' },
  { id: 'giant', name: 'ผียักษ์', en: 'Giant Ghost', color: '#bfe6ff', rarity: 2, info: 'ตัวใหญ่แต่ขี้อาย กอดอุ่นมาก' },
  { id: 'king', name: 'ราชาผี', en: 'King Ghost', color: '#ffd23f', rarity: 3, info: 'ปกครองเมืองผีด้วยความยุติธรรม มงกุฎเรืองแสงได้' },
];
export const ghostById = (id: unknown) => GHOSTS.find((g) => g.id === id) || GHOSTS[0];

/* ------------------------------ สถานที่ ------------------------------ */

export interface Place {
  id: string;
  name: string;
  en: string;
  color: string;
  sky: [string, string];
  boss: GhostBossId;
  /** ผีที่พบในสถานที่นี้ (ตัวที่ถือคำตอบถูกจะถูกจับเข้าการ์ด) */
  ghosts: GhostId[];
}
export const PLACES: Place[] = [
  { id: 'school', name: 'โรงเรียนผีสิง', en: 'Haunted School', color: '#7fb8ff', sky: ['#2a2f6b', '#4a3a8a'], boss: 'giant', ghosts: ['baby', 'school', 'friendly'] },
  { id: 'mansion', name: 'คฤหาสน์ผีสิง', en: 'Ghost Mansion', color: '#b85cff', sky: ['#2a1d50', '#5b3f9a'], boss: 'shadow', ghosts: ['baby', 'pumpkin', 'shadow'] },
  { id: 'forest', name: 'ป่าลึกลับ', en: 'Dark Forest', color: '#3fcf7a', sky: ['#132a3a', '#2a5a4a'], boss: 'shadow', ghosts: ['pumpkin', 'friendly', 'shadow'] },
  { id: 'library', name: 'ห้องสมุดผีสิง', en: 'Haunted Library', color: '#c8a3ff', sky: ['#2a1f3a', '#5a3a6b'], boss: 'wizard', ghosts: ['library', 'baby', 'candy'] },
  { id: 'castle', name: 'ปราสาทโบราณ', en: 'Ancient Castle', color: '#ffc53a', sky: ['#1f2440', '#4a3a6b'], boss: 'king', ghosts: ['giant', 'friendly', 'pumpkin'] },
  { id: 'toyward', name: 'โรงพยาบาลตุ๊กตา', en: 'Toy Hospital', color: '#ff8fc7', sky: ['#2a2a50', '#6b3a6b'], boss: 'wizard', ghosts: ['candy', 'baby', 'school'] },
  { id: 'museum', name: 'พิพิธภัณฑ์ลึกลับ', en: 'Mystery Museum', color: '#59c8ff', sky: ['#1a2a40', '#3a4a7a'], boss: 'king', ghosts: ['library', 'giant', 'shadow'] },
  { id: 'dimension', name: 'มิติแห่งวิญญาณ', en: 'Ghost Dimension', color: '#3fe0a0', sky: ['#0f0a2a', '#2a5a5a'], boss: 'lord', ghosts: ['shadow', 'giant', 'king'] },
];
export const placeById = (id: unknown) => PLACES.find((p) => p.id === id) || PLACES[0];
export function placeOpen(stars: Record<string, number>, id: string, openAll = false): boolean {
  const i = PLACES.findIndex((p) => p.id === id);
  if (i <= 0 || openAll) return i >= 0;
  return (stars[PLACES[i - 1].id] || 0) > 0;
}
export function nextPlace(stars: Record<string, number>): Place {
  return PLACES.find((p) => !stars[p.id] && placeOpen(stars, p.id)) || PLACES[PLACES.length - 1];
}
/** ผีที่จับได้ในข้อที่ n ของสถานที่ (ราชาผีหายาก: ได้เฉพาะข้อที่ 7, 14, ...) */
export function ghostFor(place: Place, n: number): GhostId {
  const pool = place.ghosts.filter((g) => g !== 'king' || n % 7 === 6);
  return pool[n % pool.length];
}

/* ------------------------------ อุปกรณ์ (ปลดล็อกด้วยความรู้) ------------------------------ */

export type GearId = 'flashlight' | 'beam' | 'shield' | 'trap' | 'detector' | 'net' | 'sonic' | 'vacuum';
export interface Gear {
  id: GearId;
  name: string;
  en: string;
  color: string;
  need: number;
  how: string;
}
export const GEARS: Gear[] = [
  { id: 'flashlight', name: 'ไฟฉายเวทมนตร์', en: 'Magic Flashlight', color: '#ffe38a', need: 0, how: 'ยื่นมือส่องหาผี (ไฟฉายตามมือ)' },
  { id: 'beam', name: 'ลำแสงดูดจับผี', en: 'Capture Beam', color: '#3fe0a0', need: 0, how: 'ส่องผีที่เจอแล้วค้างไว้ = ยิงลำแสงจับ' },
  { id: 'shield', name: 'โล่กันผี', en: 'Ghost Shield', color: '#b9a3ff', need: 0, how: 'กางแขนออกข้างเป็นตัว T' },
  { id: 'trap', name: 'กับดักจับผี', en: 'Ghost Trap', color: '#ff8fc7', need: 5, how: 'ยกสองมือเหนือหัวค้างไว้ = ชาร์จกับดัก +1' },
  { id: 'detector', name: 'เครื่องตรวจจับผี', en: 'Ghost Detector', color: '#59c8ff', need: 10, how: 'เห็นเงาจางๆ ของผีที่ซ่อนอยู่ (อัตโนมัติ)' },
  { id: 'net', name: 'ตาข่ายจับผี', en: 'Spirit Net', color: '#9ff0d0', need: 18, how: 'วงไฟฉายกว้างขึ้น (อัตโนมัติ)' },
  { id: 'sonic', name: 'เครื่องสแกนคลื่นเสียง', en: 'Sonic Scanner', color: '#ffb347', need: 28, how: 'ปรบมือ = ผีทุกตัวปรากฏ (ครูเปิดท่าปรบมือ)' },
  { id: 'vacuum', name: 'เครื่องดูดผียักษ์', en: 'Magic Vacuum', color: '#ff6b9a', need: 40, how: 'ยื่นสองมือเล็งบอสจุดเดียวกัน' },
];
export const gearById = (id: unknown) => GEARS.find((g) => g.id === id) || GEARS[0];
export const openGears = (knowledge: number) => GEARS.filter((g) => knowledge >= g.need).map((g) => g.id);
export const nextGear = (knowledge: number) => GEARS.filter((g) => knowledge < g.need).sort((a, b) => a.need - b.need)[0] || null;

export const GEAR_DMG: Partial<Record<GearId, number>> = { beam: 10, vacuum: 26, sonic: 14 };
export function beamDamage(id: GearId, power: number, combo = 0, weak = false): number {
  const base = GEAR_DMG[id] || 0;
  return Math.round(base * power * (1 + Math.min(combo, 5) * 0.05) * (weak ? 2 : 1));
}

/* ------------------------------ เลเวลนักล่า ------------------------------ */

export const HUNTER_LEVELS = [
  { name: 'Beginner Hunter', th: 'นักล่ามือใหม่', need: 0 },
  { name: 'Junior Hunter', th: 'นักล่ารุ่นเยาว์', need: 10 },
  { name: 'Expert Hunter', th: 'นักล่าผู้เชี่ยวชาญ', need: 25 },
  { name: 'Master Hunter', th: 'ปรมาจารย์นักล่า', need: 45 },
  { name: 'Legendary Hunter', th: 'นักล่าในตำนาน', need: 70 },
];
export const hunterLevel = (knowledge: number) => HUNTER_LEVELS.reduce((i, l, k) => (knowledge >= l.need ? k : i), 0);

/* ------------------------------ ตัวละคร ------------------------------ */

export interface Look {
  g: 0 | 1;
  coat: number;
  skin: number;
  /** 0 แว่นตรวจผี / 1 หมวกนักสืบ / 2 ที่คาดหัวไฟฉาย */
  hat: number;
  glow: number;
}
export const COATS = ['#6d5bff', '#2f8ae8', '#3fcf7a', '#ff6b9a', '#ffb347', '#3a2a6b'];
export const GLOWS = ['#3fe0a0', '#ffe38a', '#7fe8ff', '#ff8fc7', '#c39bff'];
export const SKINS = ['#ffe0c2', '#f5c99b', '#d9a06b', '#a8714a'];
export const HATS = ['แว่นตรวจผี', 'หมวกนักสืบ', 'ที่คาดหัวไฟฉาย'];
export const DEFAULT_LOOK: Look = { g: 0, coat: 0, skin: 0, hat: 0, glow: 0 };
const idx = (v: unknown, n: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : 0);
export function cleanLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { g: o.g === 1 ? 1 : 0, coat: idx(o.coat, COATS.length), skin: idx(o.skin, SKINS.length), hat: idx(o.hat, HATS.length), glow: idx(o.glow, GLOWS.length) };
}

/* ------------------------------ อัปเกรด (Ghost Coins) ------------------------------ */

export type SkillId = 'power' | 'range' | 'speed' | 'trap' | 'slots';
export const SKILLS: { id: SkillId; name: string; desc: string; color: string }[] = [
  { id: 'power', name: 'Beam Power', desc: 'ลำแสงจับผีแรงขึ้น +12% ต่อขั้น', color: '#3fe0a0' },
  { id: 'range', name: 'Detect Range', desc: 'วงไฟฉายกว้างขึ้น หาผีง่ายขึ้น', color: '#ffe38a' },
  { id: 'speed', name: 'Charge Speed', desc: 'ล็อกเป้าเร็วขึ้น', color: '#59c8ff' },
  { id: 'trap', name: 'Trap Power', desc: 'ได้ลำแสงต่อข้อมากขึ้นตอนสู้บอส', color: '#ff8fc7' },
  { id: 'slots', name: 'Gear Slots', desc: 'ช่องพลังเพิ่ม = หัวใจ +1 (ขั้น 3 และ 5)', color: '#b9a3ff' },
];
export const SKILL_MAX = 5;
export type Skills = Record<SkillId, number>;
export const NO_SKILLS: Skills = { power: 0, range: 0, speed: 0, trap: 0, slots: 0 };
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
  bolts: number;
  dwell: number;
  hearts: number;
  /** รัศมีไฟฉาย (สัดส่วนของด้านสั้นจอ) */
  light: number;
  /** เห็นเงาผีจางๆ (เครื่องตรวจจับ) */
  detect: boolean;
}
export function effects(s: Skills, open: GearId[]): Effects {
  return {
    power: 1 + s.power * 0.12,
    hurt: 1,
    bolts: 3 + Math.floor(s.trap / 2),
    dwell: 850 - s.speed * 60,
    hearts: 3 + (s.slots >= 3 ? 1 : 0) + (s.slots >= SKILL_MAX ? 1 : 0),
    light: 0.13 + s.range * 0.012 + (open.includes('net') ? 0.03 : 0),
    detect: open.includes('detector'),
  };
}

/* ------------------------------ ภารกิจต่อข้อ + คะแนน ------------------------------ */

/** คะแนนความรู้แยกจากคะแนนการเล่น: เจอผี 20 (ครั้งแรกของข้อ) จับผี/เบาะแส 10 สมบัติ 20 ไขปริศนา 50 ช่วยผีใจดี 50 บอส 100 ทีม 100 */
export const GH_POINTS = { correct: 100, retry: 50, speedMax: 20, comboStep: 10, comboMax: 50, found: 10, clue: 10, treasure: 20, puzzle: 50, rescue: 50, dodge: 10, hit: 5, block: 5, boss: 100, team: 100 } as const;

export function answerPoints(firstTry: boolean, usedMs: number, limitMs: number, streak: number): number {
  if (!firstTry) return GH_POINTS.retry;
  const left = limitMs > 0 ? Math.max(0, 1 - usedMs / limitMs) : 0;
  const combo = Math.min(GH_POINTS.comboMax, Math.max(0, streak - 1) * GH_POINTS.comboStep);
  return GH_POINTS.correct + Math.round(GH_POINTS.speedMax * left) + combo;
}

/** ภารกิจพิเศษของข้อที่ n: ไขปริศนาประตู (ทุกข้อที่ 3) / ช่วยผีใจดีในโถ (ข้อที่ 2, 5, 8...) */
export type Special = 'puzzle' | 'rescue' | null;
export const specialOf = (n: number): Special => (n % 3 === 2 ? 'puzzle' : n % 3 === 1 ? 'rescue' : null);
/** รอบหลังตอบถูก: เก็บเบาะแส (ข้อคู่) / หนีผีเอียงหลบ (ข้อคี่) */
export type Round = 'clue' | 'escape';
export const roundOf = (n: number): Round => (n % 2 === 0 ? 'clue' : 'escape');
export const CLUES_PER = 3;
export const OBSTACLES_PER = 3;
export const hasChest = (n: number) => specialOf(n) === null;

/** คะแนนการเล่นสูงสุดของข้อที่ n (เจอผี + รอบหลังตอบ + ภารกิจพิเศษ) ต้องน้อยกว่าคะแนนตอบถูกครั้งแรก 100 */
export function maxPlayFor(n: number): number {
  const round = roundOf(n) === 'clue' ? (hasChest(n) ? (CLUES_PER - 1) * GH_POINTS.clue + GH_POINTS.treasure : CLUES_PER * GH_POINTS.clue) : OBSTACLES_PER * GH_POINTS.dodge;
  const sp = specialOf(n);
  return GH_POINTS.found + round + (sp === 'puzzle' ? GH_POINTS.puzzle : sp === 'rescue' ? GH_POINTS.rescue : 0);
}
export function maxBattlePlay(fx: Effects, battleS: number, minEvery: number): number {
  /* ลำแสง + คอมโบ 3 + ชาร์จ + คลื่นเสียง 1 ครั้ง */
  const shots = fx.bolts + 1 + 1 + 1;
  return shots * GH_POINTS.hit + Math.ceil(battleS / minEvery) * GH_POINTS.block;
}

export function placeStars(firstCorrect: number, total: number): number {
  if (!total || !firstCorrect) return 0;
  const r = firstCorrect / total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}
export const coinsFor = (score: number, stars: number) => Math.round(score / 10) + stars * 15;
export const bossHpFor = (b: GhostBoss, bossQs: number, level: number) => Math.max(20, Math.round(Math.max(1, bossQs) * 30 * ([0.6, 0.8, 1][level] ?? 0.8) * (b.hpPer / 20)));
export function bossStart(total: number): number {
  if (total <= 2) return total - 1;
  return total - Math.max(2, Math.round(total * 0.4));
}
export function pickAtk(b: GhostBoss, prev: AtkKind[], rnd = Math.random): AtkKind {
  let k = b.atk[Math.floor(rnd() * b.atk.length)];
  if (prev.length >= 2 && prev[prev.length - 1] === k && prev[prev.length - 2] === k) k = k === 'dodge' ? 'shield' : 'dodge';
  return k;
}
/** ไฟฉายเจอผีไหม: จุดไฟอยู่ในรัศมีไฟ + ครึ่งตัวผี */
export const lit = (lx: number, ly: number, lr: number, gx: number, gy: number, gr: number) => Math.hypot(lx - gx, ly - gy) <= lr + gr * 0.5;
