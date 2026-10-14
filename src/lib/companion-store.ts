/**
 * ที่เก็บข้อมูลคู่หู/สติกเกอร์
 *
 * - สมาชิก (และ Dev): เก็บในเครื่อง (แคชแยกตามบัญชี) และซิงก์ขึ้น Supabase ตาราง companion_data
 * - ผู้ไม่มีสิทธิ์ (ผู้เยี่ยมชม/สมาชิกทั่วไป/สมาชิกหมดอายุ): โหมดล็อก
 *   ปุ๋งยังทักทายได้แต่ไม่บันทึกอะไรเลย และสะสมดาว/สติกเกอร์ไม่ได้
 */
import {
  BUDDY_COLORS,
  HATS,
  PLAY_COOLDOWN_MIN,
  STAR_RULES,
  StickerTier,
  buddyStage,
  stickerTier,
  unlockedHats,
  bkkParts,
  type Hat,
} from './companion';

const KEY_PREFIX = 'l5g_companion_v2:';
export const LEGACY_KEY = 'l5g_companion_v1';

export interface PlayRecord {
  c: number; // จำนวนครั้งที่นับ
  last: number; // เวลาล่าสุด (ms)
  title: string;
  icon: string;
  subject: string;
}

export interface CompanionState {
  v: 1;
  createdAt: number;
  savedAt: number; // เวลาที่แก้ล่าสุด (ใช้ตัดสินตอนรวมข้อมูลหลายเครื่อง)
  visitDays: string[]; // YYYY-MM-DD (เก็บล่าสุด 90 วัน)
  stars: number;
  plays: Record<string, PlayRecord>;
  lastPlayed: { id: string; title: string; at: number; day: string } | null;
  color: string;
  hat: string;
  dailyClaimed: string | null; // วันที่รับโบนัสเกมประจำวันแล้ว
}

export const EMPTY_STATE: CompanionState = {
  v: 1,
  createdAt: 0,
  savedAt: 0,
  visitDays: [],
  stars: 0,
  plays: {},
  lastPlayed: null,
  color: 'violet',
  hat: 'none',
  dailyClaimed: null,
};

export interface Reward {
  starsGained: number;
  newSticker?: { id: string; title: string; icon: string };
  tierUp?: { id: string; title: string; icon: string; tier: StickerTier };
  evolved?: { name: string; stage: number };
  dailyBonus?: boolean;
  counted: boolean; // false = ไม่นับ (เล่นซ้ำเร็วเกินไป หรือยังไม่มีสิทธิ์)
}

/* ------------------------------ ตรวจ/ล้างข้อมูลที่อ่านเข้ามา ------------------------------ */

export function sanitize(raw: unknown): CompanionState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<CompanionState>;
  const plays: Record<string, PlayRecord> = {};
  if (r.plays && typeof r.plays === 'object') {
    for (const [id, p] of Object.entries(r.plays)) {
      if (p && typeof p.c === 'number' && p.c > 0 && p.c < 100000) {
        plays[id] = {
          c: Math.floor(p.c),
          last: Number(p.last) || 0,
          title: String(p.title || '').slice(0, 150),
          icon: String(p.icon || ''),
          subject: String(p.subject || ''),
        };
      }
    }
  }
  return {
    v: 1,
    createdAt: Number(r.createdAt) || 0,
    savedAt: Number(r.savedAt) || 0,
    visitDays: Array.isArray(r.visitDays) ? r.visitDays.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))).slice(-90) : [],
    stars: Math.max(0, Math.min(1_000_000, Math.floor(Number(r.stars) || 0))),
    plays,
    lastPlayed:
      r.lastPlayed && typeof r.lastPlayed.id === 'string'
        ? {
            id: r.lastPlayed.id,
            title: String(r.lastPlayed.title || '').slice(0, 150),
            at: Number(r.lastPlayed.at) || 0,
            day: String(r.lastPlayed.day || ''),
          }
        : null,
    color: (BUDDY_COLORS as readonly string[]).includes(String(r.color)) ? String(r.color) : 'violet',
    hat: (HATS as readonly string[]).includes(String(r.hat)) ? String(r.hat) : 'none',
    dailyClaimed: typeof r.dailyClaimed === 'string' ? r.dailyClaimed : null,
  };
}

/**
 * รวมข้อมูลจากสองที่ (เช่น เครื่องนี้กับบนระบบ) โดยไม่ทำให้ความก้าวหน้าหาย
 * ดาว/จำนวนครั้งเล่น = ค่าที่มากกว่า, วันที่มาเยี่ยม = รวมกัน, สี/หมวก = ของฝั่งที่แก้ล่าสุด
 */
function createdAtOf(a: CompanionState, b: CompanionState): number {
  const cs = [a.createdAt, b.createdAt].filter((n) => n > 0);
  return cs.length ? Math.min(...cs) : 0;
}

export function mergeStates(a: CompanionState, b: CompanionState): CompanionState {
  const newer = a.savedAt >= b.savedAt ? a : b;
  const plays: Record<string, PlayRecord> = {};
  for (const id of Array.from(new Set([...Object.keys(a.plays), ...Object.keys(b.plays)]))) {
    const pa = a.plays[id];
    const pb = b.plays[id];
    if (!pa || !pb) {
      plays[id] = (pa || pb)!;
      continue;
    }
    const latest = pa.last >= pb.last ? pa : pb;
    plays[id] = { ...latest, c: Math.max(pa.c, pb.c), last: Math.max(pa.last, pb.last) };
  }
  const lp = [a.lastPlayed, b.lastPlayed].filter(Boolean) as NonNullable<CompanionState['lastPlayed']>[];
  return {
    v: 1,
    createdAt: createdAtOf(a, b),
    savedAt: Math.max(a.savedAt, b.savedAt),
    visitDays: Array.from(new Set([...a.visitDays, ...b.visitDays])).sort().slice(-90),
    stars: Math.max(a.stars, b.stars),
    plays,
    lastPlayed: lp.length ? lp.reduce((x, y) => (x.at >= y.at ? x : y)) : null,
    color: newer.color,
    hat: newer.hat,
    dailyClaimed: [a.dailyClaimed, b.dailyClaimed].filter(Boolean).sort().pop() ?? null,
  };
}

/** เท่ากันในเชิงเนื้อหา (ไม่นับ savedAt) */
function sameContent(a: CompanionState, b: CompanionState): boolean {
  return JSON.stringify({ ...a, savedAt: 0 }) === JSON.stringify({ ...b, savedAt: 0 });
}

/* ------------------------------ store ------------------------------ */

type Mode = 'off' | 'on';
let state: CompanionState = EMPTY_STATE;
let mode: Mode = 'off';
let userId: string | null = null;
let onChange: (() => void) | null = null;
const listeners = new Set<() => void>();

const keyFor = (uid: string) => `${KEY_PREFIX}${uid}`;

function persistLocal() {
  if (mode !== 'on' || !userId) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch {
    /* โหมดส่วนตัว/เต็ม: ใช้ต่อได้ในหน่วยความจำ */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getSnapshot = () => state;
export const getServerSnapshot = () => EMPTY_STATE;
export const isEnabled = () => mode === 'on';

/** ผู้ให้บริการซิงก์เรียกเมื่อข้อมูลเปลี่ยน (ใช้ตั้ง debounce บันทึกขึ้นระบบ) */
export function setChangeHandler(fn: (() => void) | null) {
  onChange = fn;
}

function commit(next: CompanionState) {
  state = { ...next, savedAt: Date.now() };
  persistLocal();
  emit();
  onChange?.();
}

/**
 * ตั้งโหมดตามสิทธิ์
 * - entitled + มี userId: โหลดแคชในเครื่องของบัญชีนี้
 * - นอกนั้น: โหมดล็อก เป็นข้อมูลทดลองในหน่วยความจำ ไม่บันทึกที่ใด
 */
export function attach(opts: { userId: string | null; entitled: boolean }) {
  if (typeof window === 'undefined') return;
  if (opts.entitled && opts.userId) {
    mode = 'on';
    userId = opts.userId;
    let local: CompanionState | null = null;
    try {
      const raw = window.localStorage.getItem(keyFor(opts.userId));
      if (raw) local = sanitize(JSON.parse(raw));
    } catch {
      /* ข้าม */
    }
    state = local && local.createdAt > 0 ? local : { ...EMPTY_STATE, createdAt: Date.now(), savedAt: 0 };
  } else {
    mode = 'off';
    userId = null;
    state = { ...EMPTY_STATE, createdAt: Date.now() };
  }
  emit();
}

/** ข้อมูลเก่าที่ผู้ใช้เคยสะสมไว้ก่อนมีระบบสมาชิก (ใช้ตั้งต้นให้บัญชีใหม่ครั้งเดียว) */
export function readLegacy(): CompanionState | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const s = sanitize(JSON.parse(raw));
    return s.createdAt > 0 && (s.stars > 0 || Object.keys(s.plays).length > 0) ? s : null;
  } catch {
    return null;
  }
}
export function clearLegacy() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ข้าม */
  }
}

/** รวมข้อมูลที่ดึงมาจากระบบเข้ากับของเครื่องนี้ คืน true ถ้าผลต่างจากบนระบบ (ต้องบันทึกกลับ) */
export function hydrate(remote: unknown | null, legacy: CompanionState | null = null): boolean {
  if (mode !== 'on') return false;
  const remoteState = remote ? sanitize(remote) : null;
  let merged = state;
  if (remoteState && remoteState.createdAt > 0) merged = mergeStates(merged, remoteState);
  if (!remoteState && legacy) merged = mergeStates(merged, legacy);
  const changedFromRemote = !remoteState || !sameContent(merged, remoteState);
  const changedLocal = !sameContent(merged, state);
  state = { ...merged, createdAt: merged.createdAt || Date.now(), savedAt: Math.max(merged.savedAt, remoteState?.savedAt || 0) };
  persistLocal();
  if (changedLocal) emit();
  return changedFromRemote;
}

export function snapshotForSave(): CompanionState {
  return state;
}

/* ----------------------------- actions ----------------------------- */

/** บันทึกการเข้าเว็บของวันนี้ คืนดาวเช็คอินที่ได้ (0 ถ้าเคยเช็คอินวันนี้แล้ว หรือยังไม่มีสิทธิ์) */
export function recordVisit(today: string): { checkinStars: number; firstEver: boolean; evolved?: Reward['evolved'] } {
  if (mode !== 'on') return { checkinStars: 0, firstEver: false };
  const firstEver = state.visitDays.length === 0 && state.stars === 0 && Object.keys(state.plays).length === 0;
  if (state.visitDays.includes(today)) return { checkinStars: 0, firstEver: false };
  const before = buddyStage(state.stars).index;
  const stars = state.stars + STAR_RULES.checkin;
  commit({ ...state, visitDays: [...state.visitDays, today].slice(-90), stars });
  const after = buddyStage(stars);
  return {
    checkinStars: STAR_RULES.checkin,
    firstEver,
    evolved: after.index > before ? { name: after.name, stage: after.index } : undefined,
  };
}

export function recordPlay(
  media: { id: string; title: string; icon_url: string; subject: string },
  opts: { dailyId?: string | null; now?: number } = {}
): Reward {
  if (mode !== 'on') return { starsGained: 0, counted: false };
  const now = opts.now ?? Date.now();
  const today = bkkParts(new Date(now)).date;
  const prev = state.plays[media.id];

  // เปิดซ้ำภายในช่วงคูลดาวน์ไม่นับ (กันกดรัวปั่นดาว)
  if (prev && now - prev.last < PLAY_COOLDOWN_MIN * 60 * 1000) {
    return { starsGained: 0, counted: false };
  }

  const count = (prev?.c || 0) + 1;
  const tierBefore = stickerTier(prev?.c || 0);
  const tierAfter = stickerTier(count);
  let gained = prev ? STAR_RULES.repeatPlay : STAR_RULES.firstPlay;

  const reward: Reward = { starsGained: 0, counted: true };
  const sticker = { id: media.id, title: media.title, icon: media.icon_url };
  if (!prev) reward.newSticker = sticker;
  else if (tierAfter > tierBefore) {
    reward.tierUp = { ...sticker, tier: tierAfter };
    gained += STAR_RULES.tierUp;
  }

  let dailyClaimed = state.dailyClaimed;
  if (opts.dailyId && opts.dailyId === media.id && state.dailyClaimed !== today) {
    gained += STAR_RULES.dailyGame;
    dailyClaimed = today;
    reward.dailyBonus = true;
  }

  const stageBefore = buddyStage(state.stars).index;
  const stars = state.stars + gained;
  const stageAfter = buddyStage(stars);
  if (stageAfter.index > stageBefore) reward.evolved = { name: stageAfter.name, stage: stageAfter.index };
  reward.starsGained = gained;

  commit({
    ...state,
    stars,
    dailyClaimed,
    plays: {
      ...state.plays,
      [media.id]: { c: count, last: now, title: media.title, icon: media.icon_url, subject: media.subject },
    },
    lastPlayed: { id: media.id, title: media.title, at: now, day: today },
  });
  return reward;
}

export function setColor(color: string) {
  if (mode !== 'on') return;
  if (!(BUDDY_COLORS as readonly string[]).includes(color)) return;
  commit({ ...state, color });
}

/** ใส่เครื่องแต่งตัว (ต้องปลดล็อกแล้วเท่านั้น) */
export function setHat(hat: string): boolean {
  if (mode !== 'on') return false;
  if (!(HATS as readonly string[]).includes(hat)) return false;
  if (!unlockedHats(state.stars, state.visitDays.length).includes(hat as Hat)) return false;
  commit({ ...state, hat });
  return true;
}

/** เริ่มใหม่ทั้งหมด (ลบทั้งในเครื่องและบนระบบ) */
export function resetStore() {
  if (mode !== 'on') return;
  commit({ ...EMPTY_STATE, createdAt: Date.now() });
}

/** ใช้ตอนทดสอบ */
export function _setStateForTest(next: CompanionState, enabled = true) {
  state = next;
  mode = enabled ? 'on' : 'off';
  userId = enabled ? 'test-user' : null;
  onChange = null;
}
