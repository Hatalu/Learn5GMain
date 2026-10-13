/**
 * ที่เก็บข้อมูลของคู่หู/สติกเกอร์ ใน localStorage ของเครื่องผู้เล่น (ไม่ต้องมีบัญชี)
 * ข้อมูลไม่ข้ามเครื่อง และผู้ใช้ล้างได้เองที่หน้า /buddy
 */
import {
  BUDDY_COLORS,
  BUDDY_STAGES,
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

const KEY = 'l5g_companion_v1';

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
  counted: boolean; // false = เล่นซ้ำเร็วเกินไป ไม่นับ
}

/* ------------------------------ store ------------------------------ */

let state: CompanionState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): CompanionState {
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
    createdAt: Number(r.createdAt) || Date.now(),
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

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* โหมดส่วนตัว/เต็ม: ใช้ต่อได้ในหน่วยความจำ */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function loadStore() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? sanitize(JSON.parse(raw)) : { ...EMPTY_STATE, createdAt: Date.now() };
  } catch {
    state = { ...EMPTY_STATE, createdAt: Date.now() };
  }
  emit();
}

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getSnapshot = () => state;
export const getServerSnapshot = () => EMPTY_STATE;

function set(next: CompanionState) {
  state = next;
  persist();
  emit();
}

/* ----------------------------- actions ----------------------------- */

/** บันทึกการเข้าเว็บของวันนี้ คืนดาวเช็คอินที่ได้ (0 ถ้าเคยเช็คอินวันนี้แล้ว) */
export function recordVisit(today: string): { checkinStars: number; firstEver: boolean; evolved?: Reward['evolved'] } {
  loadStore();
  const firstEver = state.visitDays.length === 0 && state.stars === 0 && Object.keys(state.plays).length === 0;
  if (state.visitDays.includes(today)) return { checkinStars: 0, firstEver: false };
  const before = buddyStage(state.stars).index;
  const stars = state.stars + STAR_RULES.checkin;
  set({ ...state, visitDays: [...state.visitDays, today].slice(-90), stars });
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
  loadStore();
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

  set({
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
  loadStore();
  if (!(BUDDY_COLORS as readonly string[]).includes(color)) return;
  set({ ...state, color });
}

/** ใส่เครื่องแต่งตัว (ต้องปลดล็อกแล้วเท่านั้น) */
export function setHat(hat: string): boolean {
  loadStore();
  if (!(HATS as readonly string[]).includes(hat)) return false;
  if (!unlockedHats(state.stars, state.visitDays.length).includes(hat as Hat)) return false;
  set({ ...state, hat });
  return true;
}

export function resetStore() {
  state = { ...EMPTY_STATE, createdAt: Date.now() };
  persist();
  emit();
}

/** ใช้ตอนทดสอบ */
export function _setStateForTest(next: CompanionState) {
  state = next;
  loaded = true;
}

export const stageCount = BUDDY_STAGES.length;
