/**
 * ตรรกะห้องเลี้ยงปุ๋ง ฟังก์ชันล้วน ทดสอบได้ใน selftest
 * ดาว: stars = สะสมตลอดอายุ (ใช้คิดเลเวล/ขั้นตัวละคร ไม่มีวันลด), ใช้จ่ายได้ = stars - pet.spent
 * หลอดลดตามเวลาแต่ไม่ถึงศูนย์ และไม่มีบทลงโทษ (ห้ามทำให้เด็กรู้สึกผิดที่ไม่ได้เข้าเล่น)
 */
import { FOODS, ITEMS, LEGACY_WEAR, SEASON_STAR_PRIZE, SEASON_STEPS, foodById, itemById, seasonOfMonth, type RoomSlot, type Slot, type WearSlot } from './catalog';
import { ROOMS, isRequiredSlot, isRoomSlot } from './rooms';
import { speciesById, speciesOpen, PUNG } from './species';
import { ACHIEVEMENTS, DAY_ALL_BONUS, dailyMissions, weeklyMissions, type Mission, type PetEv } from './missions';

export type NeedKey = 'food' | 'fun' | 'clean' | 'energy';
export const NEED_KEYS: NeedKey[] = ['food', 'fun', 'clean', 'energy'];
/** ลดกี่หน่วยต่อชั่วโมง */
const DECAY: Record<NeedKey, number> = { food: 5, fun: 6, clean: 3, energy: 5 };
export const NEED_FLOOR = 15;
/** นอนจริงตามนาฬิกา: แรงเพิ่มต่อชั่วโมง (0 ถึง 100 ใช้ 8 ชม.) ปิดเว็บแล้วก็นับต่อจาก sleepAt */
export const SLEEP_PER_HOUR = 12.5;
const SLEEP_DECAY = 0.5;

/** การเติบโต: วันที่โต (g) ขั้นตัวละคร และเพดานต่อการหายไปหนึ่งครั้ง (กันตั้งนาฬิกาเครื่องล่วงหน้า) */
export const GROW_FULL = 120;
export const STAGE_DAYS = [0, 0, 21, 75];
const GROW_GAP_CAP_H = 14 * 24;
export const WEIGHT_NORMAL = 50;

/** ดาวจากการตอบถูก: ข้อละ 1 ไม่เกินวันละเท่านี้ */
export const CORRECT_STAR_CAP = 40;

export type SubjKey = 'm' | 's' | 'e' | 't' | 'x';

export interface DayLog {
  d: string;
  ok: number;
  tot: number;
  /** [ถูก, รวม] แยกวิชา */
  by: Partial<Record<SubjKey, [number, number]>>;
}

export interface PuzzleRec {
  d: string;
  lv: number;
  /** 2 ถูกครั้งแรก, 1 ถูกครั้งที่สอง, 0 ไม่ถูก */
  m: string;
  s: number;
}

export interface PetState {
  hatched: boolean;
  /** ชนิดคู่หูที่เลือก (lib/pet/species) */
  species: string;
  spent: number;
  needs: Record<NeedKey, number>;
  at: number;
  /** เวลาที่เข้านอน 0 = ตื่นอยู่ */
  sleepAt: number;
  /** เวลาเกิด ms, g วันที่โตสะสม, w น้ำหนัก 15-100 (50 สมส่วน), debt ชั่วโมงอดนอน 0-24 */
  body: { born: number; g: number; w: number; debt: number };
  owned: string[];
  wear: Partial<Record<WearSlot, string>>;
  room: Partial<Record<RoomSlot, string>>;
  day: { d: string; c: Partial<Record<PetEv, number>>; done: string[]; earned: number; allDone: boolean };
  week: { w: string; c: Partial<Record<PetEv, number>>; done: string[] };
  total: Partial<Record<PetEv, number>>;
  ach: string[];
  season: { k: string; pts: number; got: number[] };
  puzzles: PuzzleRec[];
  log: DayLog[];
}

export interface PS {
  stars: number;
  pet: PetState;
}

/** ทุกห้องเริ่มมีของพอดูอบอุ่น ของเหล่านี้ราคา 0 */
export const DEFAULT_ROOM: Partial<Record<RoomSlot, string>> = Object.assign({}, ...ROOMS.map((r) => r.starter));

export function emptyPet(): PetState {
  return {
    hatched: false,
    species: PUNG,
    spent: 0,
    needs: { food: 70, fun: 70, clean: 80, energy: 80 },
    at: 0,
    sleepAt: 0,
    body: { born: 0, g: 0, w: WEIGHT_NORMAL, debt: 0 },
    owned: [],
    wear: {},
    room: { ...DEFAULT_ROOM },
    day: { d: '', c: {}, done: [], earned: 0, allDone: false },
    week: { w: '', c: {}, done: [] },
    total: {},
    ach: [],
    season: { k: '', pts: 0, got: [] },
    puzzles: [],
    log: [],
  };
}

const num = (v: unknown, lo: number, hi: number, dflt = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};
const counters = (v: unknown): Partial<Record<PetEv, number>> => {
  const out: Partial<Record<PetEv, number>> = {};
  if (v && typeof v === 'object') for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && n > 0) out[k as PetEv] = Math.min(1_000_000, Math.floor(n));
  return out;
};
const strs = (v: unknown, max: number): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(-max) : []);
const dayRe = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ตรวจข้อมูลที่อ่านเข้ามา ของที่ไม่รู้จักตัดทิ้ง; legacyHat = หมวกจากระบบเดิม
 * starStage = ขั้นเดิมจากดาว ข้อมูลก่อนมีการเติบโตเริ่มที่ขั้นนั้น คู่หูจะไม่ตัวเล็กลงหลังอัปเดต
 */
export function cleanPet(raw: unknown, legacyHat?: string, starStage = 0): PetState {
  const base = emptyPet();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<PetState>;
  const wear: PetState['wear'] = {};
  for (const [slot, id] of Object.entries(r.wear || {})) {
    if (typeof id === 'string' && itemById(id)?.slot === slot) wear[slot as WearSlot] = id;
  }
  if (!r.wear && legacyHat && LEGACY_WEAR[legacyHat]) wear[LEGACY_WEAR[legacyHat]] = legacyHat;
  const room: PetState['room'] = {};
  for (const [slot, id] of Object.entries(r.room || {})) {
    if (typeof id === 'string' && itemById(id)?.slot === slot) room[slot as RoomSlot] = id;
  }
  // ห้องที่ยังไม่เคยจัด (รวมข้อมูลก่อนมีหลายห้อง) ได้ของตั้งต้น ห้องที่เคยจัดแล้วเก็บชิ้นที่เอาออกไว้ตามเดิม
  for (const def of ROOMS) {
    if (!def.slots.some((x) => room[x.id])) Object.assign(room, def.starter);
    room[def.wall] = room[def.wall] || def.starter[def.wall];
    room[def.floor] = room[def.floor] || def.starter[def.floor];
  }
  const needs = { ...base.needs };
  for (const k of NEED_KEYS) needs[k] = num(r.needs?.[k], NEED_FLOOR, 100, base.needs[k]);
  return {
    hatched: !!r.hatched,
    species: speciesById(r.species) ? r.species! : PUNG,
    spent: Math.floor(num(r.spent, 0, 1_000_000)),
    needs,
    at: num(r.at, 0, 9e15),
    sleepAt: num(r.sleepAt, 0, 9e15),
    body: {
      born: num(r.body?.born, 0, 9e15, num(r.at, 0, 9e15)),
      g: num(r.body?.g, 0, 100000, STAGE_DAYS[Math.max(0, Math.min(3, starStage))]),
      w: num(r.body?.w, 15, 100, WEIGHT_NORMAL),
      debt: num(r.body?.debt, 0, 24),
    },
    owned: strs(r.owned, 400).filter((id) => itemById(id)),
    wear,
    room,
    day: {
      d: dayRe.test(String(r.day?.d)) ? String(r.day?.d) : '',
      c: counters(r.day?.c),
      done: strs(r.day?.done, 20),
      earned: Math.floor(num(r.day?.earned, 0, 100000)),
      allDone: !!r.day?.allDone,
    },
    week: { w: dayRe.test(String(r.week?.w)) ? String(r.week?.w) : '', c: counters(r.week?.c), done: strs(r.week?.done, 20) },
    total: counters(r.total),
    ach: strs(r.ach, 100),
    season: {
      k: /^\d{4}-\d{2}$/.test(String(r.season?.k)) ? String(r.season?.k) : '',
      pts: Math.floor(num(r.season?.pts, 0, 100000)),
      got: Array.isArray(r.season?.got) ? r.season!.got.filter((n) => n === 0 || n === 1 || n === 2) : [],
    },
    puzzles: (Array.isArray(r.puzzles) ? r.puzzles : [])
      .filter((p) => p && dayRe.test(String(p.d)) && /^[012]{1,8}$/.test(String(p.m)))
      .slice(-60)
      .map((p) => ({ d: p.d, lv: num(p.lv, 1, 3, 1), m: p.m, s: num(p.s, 0, 3600) })),
    log: (Array.isArray(r.log) ? r.log : [])
      .filter((l) => l && dayRe.test(String(l.d)))
      .slice(-35)
      .map((l) => {
        const by: DayLog['by'] = {};
        for (const [k, v] of Object.entries(l.by || {})) if (Array.isArray(v)) by[k as SubjKey] = [num(v[0], 0, 99999), num(v[1], 0, 99999)];
        return { d: l.d, ok: num(l.ok, 0, 99999), tot: num(l.tot, 0, 99999), by };
      }),
  };
}

/** รวมสองเครื่อง: ของที่สะสมไม่หาย การแต่งตัว/หลอดเอาของฝั่งที่แก้ล่าสุด */
export function mergePet(a: PetState, b: PetState, aNewer: boolean): PetState {
  const n = aNewer ? a : b;
  const maxC = (x: Partial<Record<PetEv, number>>, y: Partial<Record<PetEv, number>>) => {
    const out = { ...x };
    for (const [k, v] of Object.entries(y)) out[k as PetEv] = Math.max(out[k as PetEv] || 0, v || 0);
    return out;
  };
  const byDay = new Map<string, DayLog>();
  for (const l of [...a.log, ...b.log]) {
    const o = byDay.get(l.d);
    if (!o || l.tot > o.tot) byDay.set(l.d, l);
  }
  const pz = new Map<string, PuzzleRec>();
  for (const p of [...a.puzzles, ...b.puzzles]) if (!pz.has(p.d)) pz.set(p.d, p);
  return {
    ...n,
    hatched: a.hatched || b.hatched,
    // เครื่องที่ใหม่กว่าไม่รีเซ็ตอายุ: เกิดเร็วสุด โตมากสุด
    body: { ...n.body, born: Math.min(a.body.born || Infinity, b.body.born || Infinity) === Infinity ? 0 : Math.min(a.body.born || Infinity, b.body.born || Infinity), g: Math.max(a.body.g, b.body.g) },
    spent: Math.max(a.spent, b.spent),
    owned: Array.from(new Set([...a.owned, ...b.owned])),
    total: maxC(a.total, b.total),
    ach: Array.from(new Set([...a.ach, ...b.ach])),
    log: Array.from(byDay.values()).sort((x, y) => x.d.localeCompare(y.d)).slice(-35),
    puzzles: Array.from(pz.values()).sort((x, y) => x.d.localeCompare(y.d)).slice(-60),
  };
}

/* ------------------------------ เลเวลและดาว ------------------------------ */

/** เลเวล L ต้องใช้ดาวสะสม 5*L*(L-1): 1:0 2:10 3:30 4:60 5:100 ... */
export function petLevel(stars: number): { lv: number; from: number; next: number; pct: number } {
  let lv = 1;
  while (lv < 60 && stars >= 5 * (lv + 1) * lv) lv++;
  const from = 5 * lv * (lv - 1);
  const next = 5 * (lv + 1) * lv;
  return { lv, from, next, pct: Math.min(100, Math.round(((stars - from) / (next - from)) * 100)) };
}

export const balance = (ps: PS) => Math.max(0, ps.stars - ps.pet.spent);

/* ------------------------------ วัน/สัปดาห์/ซีซัน ------------------------------ */

/** วันจันทร์ของสัปดาห์ที่มีวันนั้น */
export function weekOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

/** ขึ้นวันใหม่/สัปดาห์ใหม่/เดือนใหม่: ล้างตัวนับ ส่วนรางวัลซีซันที่ถึงแล้วแต่ลืมกดรับ ให้เลย */
export function roll(ps: PS, today: string): PS {
  let { pet, stars } = ps;
  if (pet.day.d !== today) pet = { ...pet, day: { d: today, c: {}, done: [], earned: 0, allDone: false } };
  const w = weekOf(today);
  if (pet.week.w !== w) pet = { ...pet, week: { w, c: {}, done: [] } };
  const k = today.slice(0, 7);
  if (pet.season.k !== k) {
    if (pet.season.k) {
      const r = grantSeason({ stars, pet }, pet.season.k);
      stars = r.stars;
      pet = r.pet;
    }
    pet = { ...pet, season: { k, pts: 0, got: [] } };
  }
  return { stars, pet };
}

function grantSeason(ps: PS, key: string): PS {
  const s = seasonOfMonth(Number(key.slice(5, 7)));
  let { stars } = ps;
  const owned = new Set(ps.pet.owned);
  const got = new Set(ps.pet.season.got);
  SEASON_STEPS.forEach((need, i) => {
    if (ps.pet.season.pts < need || got.has(i)) return;
    got.add(i);
    if (i === 0) owned.add(s.decor.id);
    else if (i === 1) owned.add(s.wear.id);
    else stars += SEASON_STAR_PRIZE;
  });
  return { stars, pet: { ...ps.pet, owned: Array.from(owned), season: { ...ps.pet.season, got: Array.from(got) } } };
}

/** กดรับรางวัลซีซันขั้นที่ถึงแล้ว */
export function claimSeason(ps0: PS, today: string): PS {
  const ps = roll(ps0, today);
  return grantSeason(ps, today.slice(0, 7));
}

function bump(pet: PetState, ev: PetEv, n = 1): PetState {
  const add = (c: Partial<Record<PetEv, number>>) => ({ ...c, [ev]: (c[ev] || 0) + n });
  return { ...pet, day: { ...pet.day, c: add(pet.day.c) }, week: { ...pet.week, c: add(pet.week.c) }, total: add(pet.total) };
}

/** เหตุการณ์ทั่วไป (ลูบหัว เปิดสมุด ฯลฯ) */
export function track(ps0: PS, ev: PetEv, today: string, n = 1): PS {
  const ps = roll(ps0, today);
  return { ...ps, pet: bump(ps.pet, ev, n) };
}

/** เข้าเล่นวันแรกของวัน */
export function trackVisit(ps0: PS, today: string): PS {
  const ps = roll(ps0, today);
  if (ps.pet.day.c.visit) return ps;
  return { ...ps, pet: bump(ps.pet, 'visit') };
}

/* ------------------------------ ภารกิจ ------------------------------ */

export interface MissionRow extends Mission {
  have: number;
  claimable: boolean;
  claimed: boolean;
}

const row = (m: Mission, have: number, claimed: boolean): MissionRow => ({ ...m, have: Math.min(have, m.need), claimed, claimable: !claimed && have >= m.need });

export function missionRows(ps: PS, today: string) {
  const { pet } = roll(ps, today);
  const daily = dailyMissions(today).map((m) => row(m, pet.day.c[m.ev] || 0, pet.day.done.includes(m.id)));
  const weekly = weeklyMissions(pet.week.w).map((m) => row(m, pet.week.c[m.ev] || 0, pet.week.done.includes(m.id)));
  // ความสำเร็จแสดงเฉพาะขั้นถัดไปของแต่ละเหตุการณ์
  const achievements: MissionRow[] = [];
  const seen = new Set<PetEv>();
  for (const m of ACHIEVEMENTS) {
    const claimed = pet.ach.includes(m.id);
    if (claimed || seen.has(m.ev)) continue;
    seen.add(m.ev);
    achievements.push(row(m, pet.total[m.ev] || 0, false));
  }
  const allClaimed = daily.every((m) => m.claimed);
  return {
    daily,
    weekly,
    achievements,
    achDone: pet.ach.length,
    achTotal: ACHIEVEMENTS.length,
    allBonus: { ready: allClaimed && !pet.day.allDone, done: pet.day.allDone, stars: DAY_ALL_BONUS },
    claimable: [...daily, ...weekly, ...achievements].filter((m) => m.claimable).length + (allClaimed && !pet.day.allDone ? 1 : 0),
  };
}

/** กดรับรางวัลภารกิจ คืน ps เดิมถ้ารับไม่ได้ */
export function claimMission(ps0: PS, id: string, today: string): { ps: PS; stars: number } {
  const ps = roll(ps0, today);
  const rows = missionRows(ps, today);
  const m = [...rows.daily, ...rows.weekly, ...rows.achievements].find((r) => r.id === id);
  if (!m || !m.claimable) return { ps: ps0, stars: 0 };
  let { pet } = ps;
  if (rows.daily.some((r) => r.id === id)) pet = { ...pet, day: { ...pet.day, done: [...pet.day.done, id] } };
  else if (rows.weekly.some((r) => r.id === id)) pet = { ...pet, week: { ...pet.week, done: [...pet.week.done, id] } };
  else pet = { ...pet, ach: [...pet.ach, id] };
  pet = { ...pet, season: { ...pet.season, pts: pet.season.pts + 2 } };
  return { ps: { stars: ps.stars + m.stars, pet }, stars: m.stars };
}

export function claimAllBonus(ps0: PS, today: string): { ps: PS; stars: number } {
  const ps = roll(ps0, today);
  if (!missionRows(ps, today).allBonus.ready) return { ps: ps0, stars: 0 };
  return { ps: { stars: ps.stars + DAY_ALL_BONUS, pet: { ...ps.pet, day: { ...ps.pet.day, allDone: true } } }, stars: DAY_ALL_BONUS };
}

/* ------------------------------ หลอด ------------------------------ */

/** เวลาตื่นเอง: นอนจนแรงเต็ม (ms) 0 = ไม่ได้นอน */
export function wakeTime(pet: Pick<PetState, 'sleepAt' | 'needs'>): number {
  if (!pet.sleepAt) return 0;
  return pet.sleepAt + (Math.max(0, 100 - pet.needs.energy) / SLEEP_PER_HOUR) * 3600000;
}
export const sleepDone = (pet: Pick<PetState, 'sleepAt' | 'needs'>, now: number) => !!pet.sleepAt && now >= wakeTime(pet);

/** ช่วงที่ผ่านไปแบ่งเป็นชั่วโมงหลับ/ตื่น นาฬิกาย้อนหลัง = 0 */
function spanOf(pet: PetState, now: number): { h: number; asleep: number; awake: number } {
  const h = pet.at ? Math.max(0, now - pet.at) / 3600000 : 0;
  if (!pet.sleepAt) return { h, asleep: 0, awake: h };
  const asleep = Math.min(h, Math.max(0, wakeTime(pet) - Math.max(pet.at, pet.sleepAt)) / 3600000);
  return { h, asleep, awake: h - asleep };
}

/** ค่าหลอด ณ เวลาหนึ่ง (คิดตอนอ่าน ไม่ต้องบันทึกทุกวินาที ปิดเว็บไปก็คิดจากเวลาจริง) */
export function needsAt(pet: PetState, now: number): Record<NeedKey, number> {
  const out = { ...pet.needs };
  if (!pet.at) return out;
  const { asleep, awake } = spanOf(pet, now);
  for (const k of NEED_KEYS) out[k] = Math.max(NEED_FLOOR, Math.min(100, pet.needs[k] - DECAY[k] * (awake + asleep * SLEEP_DECAY)));
  if (pet.sleepAt) out.energy = Math.max(NEED_FLOOR, Math.min(100, pet.needs.energy + asleep * SLEEP_PER_HOUR - awake * DECAY.energy));
  return out;
}

/** ร่างกาย ณ เวลาหนึ่ง: โตตามเวลาจริงคูณการดูแล น้ำหนักค่อยๆ กลับสู่สมส่วน */
export function bodyAt(pet: PetState, now: number): PetState['body'] {
  const b = pet.body;
  if (!pet.at) return b;
  const { h, asleep, awake } = spanOf(pet, now);
  if (!h) return b;
  const end = needsAt(pet, now);
  const avg = (k: NeedKey) => (pet.needs[k] + end[k]) / 2;
  const care = 0.4 + (0.6 * (avg('food') + avg('energy') + avg('clean'))) / 300;
  const days = h / 24;
  const g = b.g + (Math.min(h, GROW_GAP_CAP_H) / 24) * care;
  let w = b.w;
  w += Math.sign(WEIGHT_NORMAL - w) * Math.min(Math.abs(WEIGHT_NORMAL - w), 1.5 * days);
  if (avg('food') < 25) w -= 1.5 * days;
  const debt = b.debt - asleep * 2 + (avg('energy') < 35 ? awake : 0);
  return { born: b.born, g, w: Math.max(15, Math.min(100, w)), debt: Math.max(0, Math.min(24, debt)) };
}

function setNeeds(pet: PetState, patch: Partial<Record<NeedKey, number>>, now: number): PetState {
  const cur = needsAt(pet, now);
  const needs = { ...cur };
  for (const [k, v] of Object.entries(patch)) needs[k as NeedKey] = Math.max(NEED_FLOOR, Math.min(100, cur[k as NeedKey] + (v as number)));
  return { ...pet, needs, body: bodyAt(pet, now), at: now };
}

const addWeight = (pet: PetState, d: number): PetState => ({ ...pet, body: { ...pet.body, w: Math.max(15, Math.min(100, pet.body.w + d)) } });

export const stageOfGrowth = (g: number) => (g >= STAGE_DAYS[3] ? 3 : g >= STAGE_DAYS[2] ? 2 : 1);
export const STAGE_LABEL = ['ไข่', 'วัยเบบี้', 'วัยเด็ก', 'โตเต็มวัย'];

export type WeightBand = 'thin' | 'fit' | 'chubby' | 'round';
export const weightBand = (w: number): WeightBand => (w >= 80 ? 'round' : w >= 65 ? 'chubby' : w <= 30 ? 'thin' : 'fit');
export const WEIGHT_LABEL: Record<WeightBand, string> = { thin: 'ผอมไปนิด', fit: 'สมส่วน', chubby: 'ตุ้ยนุ้ย', round: 'ตุ้ยนุ้ยมาก' };

/** ขอบตาดำ: 0 ไม่มี 1 เริ่มมี 2 ชัดเจน จากแรงที่เหลือและการอดนอนสะสม */
export function tiredLevel(energy: number, debt: number): 0 | 1 | 2 {
  if (energy < 25 || debt >= 10) return 2;
  if (energy < 40 || debt >= 4) return 1;
  return 0;
}

/** ค่าที่ส่งให้ Buddy ทุกจอใช้ชุดเดียวกัน คู่หูจะได้หน้าตาเดียวกันทั้งเว็บ */
export function bodyLook(pet: PetState, hatched: boolean, now: number) {
  const b = bodyAt(pet, now);
  const energy = needsAt(pet, now).energy;
  return {
    stage: hatched ? stageOfGrowth(b.g) : 0,
    grow: Math.min(1, b.g / GROW_FULL),
    weight: b.w,
    tired: tiredLevel(energy, b.debt),
    asleep: !!pet.sleepAt && !sleepDone(pet, now),
  };
}

/** หลังเปลี่ยนหลอด: ถึงเกณฑ์ก็นับภารกิจ */
function afterCare(pet: PetState): PetState {
  let p = pet;
  if (p.needs.food >= 95 && !p.day.c.full) p = bump(p, 'full');
  if (NEED_KEYS.every((k) => p.needs[k] >= 70) && !p.day.c.happy) p = bump(p, 'happy');
  return p;
}

export type Mood = 'happy' | 'hungry' | 'bored' | 'dirty' | 'sleepy';
/** หลอดที่ต่ำสุด ถ้าต่ำกว่า 40 ปุ๋งจะบอก ไม่เช่นนั้นอารมณ์ดี */
export function moodOf(needs: Record<NeedKey, number>): Mood {
  const low = [...NEED_KEYS].sort((a, b) => needs[a] - needs[b])[0];
  if (needs[low] >= 40) return 'happy';
  return ({ food: 'hungry', fun: 'bored', clean: 'dirty', energy: 'sleepy' } as const)[low];
}

/** ฟักไข่: ให้ดาวตั้งต้นพอซื้อของแรก */
export const HATCH_STARS = 8;
export function hatch(ps: PS, now: number): PS {
  if (ps.pet.hatched) return ps;
  return { stars: ps.stars + HATCH_STARS, pet: { ...ps.pet, hatched: true, at: now, body: { ...ps.pet.body, born: ps.pet.body.born || now } } };
}

export function feed(ps0: PS, foodId: string, now: number, today: string): { ps: PS; ok: boolean } {
  const ps = roll(ps0, today);
  const f = foodById(foodId);
  if (!f || balance(ps) < f.price) return { ps: ps0, ok: false };
  const stuffed = needsAt(ps.pet, now).food >= 95;
  let pet = setNeeds(ps.pet, { food: f.food, energy: f.good ? 4 : 0, fun: f.sweet ? 10 : 2 }, now);
  // ของหวานทำให้ตุ้ยนุ้ยเร็ว อิ่มแล้วยังกินก็เพิ่ม ผักผลไม้ช่วยดึงกลับสู่สมส่วน
  const w = pet.body.w;
  pet = addWeight(pet, (f.sweet ? 4 : f.good ? (w > WEIGHT_NORMAL ? -1 : w < WEIGHT_NORMAL ? 1 : 0) : 1) + (stuffed ? 2 : 0));
  pet = bump(pet, 'feed');
  if (f.good) pet = bump(pet, 'veg');
  pet = afterCare({ ...pet, spent: pet.spent + f.price });
  return { ps: { ...ps, pet }, ok: true };
}

export function washDone(ps0: PS, now: number, today: string): PS {
  const ps = roll(ps0, today);
  return { ...ps, pet: afterCare(bump(setNeeds(ps.pet, { clean: 100, fun: 3 }, now), 'wash')) };
}

export function sleepStart(ps0: PS, now: number, today: string): PS {
  const ps = roll(ps0, today);
  return { ...ps, pet: bump({ ...setNeeds(ps.pet, {}, now), sleepAt: now }, 'sleep') };
}

/** ตื่น: นอนครบตั้งแต่ 6 ชม. ขึ้นไปได้โตเพิ่มเล็กน้อย (เด็กโตตอนหลับ) */
export function wakeUp(ps0: PS, now: number): PS {
  const p = ps0.pet;
  const needs = needsAt(p, now);
  const slept = p.sleepAt ? Math.min(Math.max(0, now - p.sleepAt), Math.max(0, wakeTime(p) - p.sleepAt)) / 3600000 : 0;
  const body = bodyAt(p, now);
  return { ...ps0, pet: afterCare({ ...p, needs, body: { ...body, g: body.g + (slept >= 6 ? 0.25 : 0) }, at: now, sleepAt: 0 }) };
}

/** ลูบหัว: สนุกขึ้นเล็กน้อย */
export function petTap(ps0: PS, now: number, today: string): PS {
  const ps = roll(ps0, today);
  return { ...ps, pet: afterCare(bump(setNeeds(ps.pet, { fun: 2 }, now), 'pet')) };
}

/** จบมินิเกม: สนุกขึ้น ไม่ให้ดาว (ดาวมาจากการตอบถูกเป็นหลัก) */
export function gameDone(ps0: PS, kind: 'catch' | 'match' | 'balloon', now: number, today: string): PS {
  const ps = roll(ps0, today);
  let pet = setNeeds(ps.pet, { fun: 30, energy: -6 }, now);
  if (kind === 'catch' && pet.body.w > 35) pet = addWeight(pet, -3);
  pet = bump(pet, 'game');
  if (kind !== 'balloon') pet = bump(pet, kind);
  return { ...ps, pet: afterCare(pet) };
}

/* ------------------------------ ของ ------------------------------ */

/** ของที่มีอยู่ รวมของปลดล็อกเดิม 4 ชิ้น และของราคา 0 */
export function ownsItem(pet: PetState, id: string, legacyOpen: readonly string[] = []): boolean {
  const it = itemById(id);
  if (!it) return false;
  if (LEGACY_WEAR[id]) return legacyOpen.includes(id);
  if (it.season) return pet.owned.includes(id);
  return it.price === 0 || pet.owned.includes(id);
}

export type BuyFail = 'owned' | 'level' | 'stars' | 'season' | 'none';
export function buyCheck(ps: PS, id: string): BuyFail | null {
  const it = itemById(id);
  if (!it) return 'none';
  if (it.season || LEGACY_WEAR[id]) return 'season';
  if (it.price === 0 || ps.pet.owned.includes(id)) return 'owned';
  if ((it.lv || 1) > petLevel(ps.stars).lv) return 'level';
  if (balance(ps) < it.price) return 'stars';
  return null;
}

export function buy(ps0: PS, id: string, today: string): { ps: PS; ok: boolean } {
  const ps = roll(ps0, today);
  if (buyCheck(ps, id)) return { ps: ps0, ok: false };
  const it = itemById(id)!;
  const pet = bump({ ...ps.pet, owned: [...ps.pet.owned, id], spent: ps.pet.spent + it.price }, 'buy');
  return { ps: { ...ps, pet }, ok: true };
}

/** ใส่/ถอด หรือวาง/เก็บ (id ซ้ำชิ้นเดิม = เอาออก ผนังกับพื้นเอาออกไม่ได้) */
export function equip(ps0: PS, slot: Slot, id: string, today: string): PS {
  const ps = roll(ps0, today);
  const isWear = slot === 'hat' || slot === 'face' || slot === 'body' || slot === 'back';
  if (isWear) {
    const wear = { ...ps.pet.wear };
    if (wear[slot as WearSlot] === id) delete wear[slot as WearSlot];
    else wear[slot as WearSlot] = id;
    return { ...ps, pet: bump({ ...ps.pet, wear }, 'wear') };
  }
  if (!isRoomSlot(slot)) return ps;
  const room = { ...ps.pet.room };
  if (room[slot] === id) {
    if (!isRequiredSlot(slot)) delete room[slot];
  } else room[slot] = id;
  return { ...ps, pet: bump({ ...ps.pet, room }, 'decor') };
}

/** เลือกคู่หู เฉพาะชนิดที่ปลดล็อกแล้ว */
export function pickSpecies(ps: PS, id: string): PS {
  const s = speciesById(id);
  if (!s || !speciesOpen(ps.pet, s)) return ps;
  return { ...ps, pet: { ...ps.pet, species: id } };
}

/* ------------------------------ ตอบคำถาม ------------------------------ */

export function logAnswer(ps0: PS, ok: boolean, subj: SubjKey, today: string): { ps: PS; gained: number } {
  const ps = roll(ps0, today);
  let pet = bump(ps.pet, 'answer');
  const log = [...pet.log];
  const i = log.findIndex((l) => l.d === today);
  const cur: DayLog = i >= 0 ? log[i] : { d: today, ok: 0, tot: 0, by: {} };
  const s = cur.by[subj] || [0, 0];
  const next: DayLog = { ...cur, ok: cur.ok + (ok ? 1 : 0), tot: cur.tot + 1, by: { ...cur.by, [subj]: [s[0] + (ok ? 1 : 0), s[1] + 1] } };
  if (i >= 0) log[i] = next;
  else log.push(next);
  pet = { ...pet, log: log.slice(-35) };
  if (!ok) return { ps: { ...ps, pet }, gained: 0 };
  pet = bump(pet, 'correct');
  const gained = pet.day.earned < CORRECT_STAR_CAP ? 1 : 0;
  pet = { ...pet, day: { ...pet.day, earned: pet.day.earned + gained }, season: { ...pet.season, pts: pet.season.pts + 1 } };
  return { ps: { stars: ps.stars + gained, pet }, gained };
}

/* ------------------------------ ปริศนา ------------------------------ */

/** ดาวปริศนา: ถูกครั้งแรก 2 ถูกครั้งที่สอง 1 + เล่นจบ 2 */
export function puzzleStars(marks: string): number {
  let n = 2;
  for (const c of marks) n += c === '2' ? 2 : c === '1' ? 1 : 0;
  return n;
}

export function savePuzzle(ps0: PS, rec: PuzzleRec, today: string): { ps: PS; stars: number } {
  const ps = roll(ps0, today);
  if (rec.d !== today || ps.pet.puzzles.some((p) => p.d === today)) return { ps: ps0, stars: 0 };
  const stars = puzzleStars(rec.m);
  let pet = bump(ps.pet, 'puzzle');
  pet = { ...pet, puzzles: [...pet.puzzles, rec].slice(-60), season: { ...pet.season, pts: pet.season.pts + 5 } };
  return { ps: { stars: ps.stars + stars, pet }, stars };
}

function prevDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** วันต่อเนื่อง ยังไม่เล่นวันนี้ก็ไม่ตัด นับจากเมื่อวาน */
export function puzzleStreak(pet: PetState, today: string): number {
  const days = new Set(pet.puzzles.map((p) => p.d));
  let d = days.has(today) ? today : prevDay(today);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = prevDay(d);
  }
  return n;
}

export const itemCount = () => ITEMS.length + FOODS.length;
