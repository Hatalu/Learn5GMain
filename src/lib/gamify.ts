/**
 * ตรรกะเกมมิฟิเคชันของ Learn5G (ฟังก์ชันล้วน ใช้ได้ทั้ง server และ client)
 *
 * หลักการ: รางวัลมาจาก "การเรียนรู้" เท่านั้น (ฝีมือ ความสม่ำเสมอ ความหลากหลาย)
 * ไม่มีการสุ่มรางวัล ไม่มีการซื้อ และสตรีคมี "วันพักฟรี" ไม่ลงโทษเด็ก
 */

/* ---------------------------------------------------------------- */
/* วันที่ (ใช้เวลาไทย)                                               */
/* ---------------------------------------------------------------- */

const TZ = 'Asia/Bangkok';

/** วันที่รูปแบบ YYYY-MM-DD ตามเวลาไทย */
export function bangkokDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function toUtcDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

export function daysBetween(from: string, to: string): number {
  return Math.round(toUtcDay(to) - toUtcDay(from));
}

/** คีย์สัปดาห์แบบ ISO เช่น 2026-W41 */
export function isoWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* ---------------------------------------------------------------- */
/* สตรีคแบบใจดี                                                      */
/* ---------------------------------------------------------------- */

export interface StreakState {
  streak: number;
  best: number;
  lastDate: string | null;
  lastFreezeWeek: string | null;
}

/**
 * ขาดเล่น 1 วันได้ 1 ครั้งต่อสัปดาห์โดยสตรีคไม่ขาด ("วันพักฟรี")
 */
export function updateStreak(prev: StreakState, today: string): StreakState {
  if (!prev.lastDate) {
    return { streak: 1, best: Math.max(prev.best, 1), lastDate: today, lastFreezeWeek: prev.lastFreezeWeek };
  }
  const gap = daysBetween(prev.lastDate, today);
  if (gap <= 0) return prev;

  let streak = 1;
  let freezeWeek = prev.lastFreezeWeek;
  if (gap === 1) {
    streak = prev.streak + 1;
  } else if (gap === 2 && prev.lastFreezeWeek !== isoWeekKey(today)) {
    streak = prev.streak + 1;
    freezeWeek = isoWeekKey(today);
  }
  return {
    streak,
    best: Math.max(prev.best, streak),
    lastDate: today,
    lastFreezeWeek: freezeWeek,
  };
}

/** สตรีคที่ "ยังนับอยู่" ณ วันนี้ (ใช้แสดงผลเมื่อเด็กยังไม่ได้เล่นวันนี้) */
export function liveStreak(state: StreakState, today: string): number {
  if (!state.lastDate) return 0;
  const gap = daysBetween(state.lastDate, today);
  if (gap <= 1) return state.streak;
  if (gap === 2 && state.lastFreezeWeek !== isoWeekKey(today)) return state.streak;
  return 0;
}

/* ---------------------------------------------------------------- */
/* ดาวและตัวละครคู่หู                                                */
/* ---------------------------------------------------------------- */

/** คำนวณดาว 0-3 จากความแม่นยำ */
export function starsFromAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  if (acc >= 0.4) return 1;
  return 0;
}

export const BUDDY_STAGES = [
  { min: 0, name: 'ไข่มหัศจรรย์' },
  { min: 12, name: 'ลูกน้อยจอมซน' },
  { min: 40, name: 'นักผจญภัย' },
  { min: 90, name: 'ฮีโร่แห่ง 5G' },
] as const;

export function buddyStage(totalStars: number): { index: number; name: string; next: number | null } {
  let index = 0;
  BUDDY_STAGES.forEach((s, i) => {
    if (totalStars >= s.min) index = i;
  });
  const next = index < BUDDY_STAGES.length - 1 ? BUDDY_STAGES[index + 1].min : null;
  return { index, name: BUDDY_STAGES[index].name, next };
}

export const BUDDY_COLORS = ['violet', 'pink', 'mint', 'sky', 'sun', 'coral'] as const;
export type BuddyColor = (typeof BUDDY_COLORS)[number];

export const BUDDY_COLOR_HEX: Record<BuddyColor, { body: string; dark: string; light: string }> = {
  violet: { body: '#8660fb', dark: '#5f2fd4', light: '#bfa9ff' },
  pink: { body: '#f53d9b', dark: '#bb1569', light: '#ff94cc' },
  mint: { body: '#2fd196', dark: '#17b07a', light: '#8cf0c8' },
  sky: { body: '#2eb4f5', dark: '#1a86c0', light: '#9adcfb' },
  sun: { body: '#ffc53a', dark: '#f5a50f', light: '#ffe08a' },
  coral: { body: '#ff7a59', dark: '#d9532f', light: '#ffb199' },
};

export const HATS = ['none', 'cap', 'glasses', 'cape', 'crown'] as const;
export type Hat = (typeof HATS)[number];

export const HAT_INFO: Record<Hat, { label: string; hint: string }> = {
  none: { label: 'ไม่ใส่', hint: '' },
  cap: { label: 'หมวกนักผจญภัย', hint: 'เมื่อตัวละครโตเป็นลูกน้อย (12 ดาว)' },
  glasses: { label: 'แว่นนักคิด', hint: 'สะสมครบ 25 ดาว' },
  cape: { label: 'ผ้าคลุมฮีโร่', hint: 'เล่นต่อเนื่อง 3 วัน' },
  crown: { label: 'มงกุฎดาว', hint: 'สะสมครบ 60 ดาว' },
};

export function unlockedHats(totalStars: number, bestStreak: number): Hat[] {
  const out: Hat[] = ['none'];
  if (totalStars >= BUDDY_STAGES[1].min) out.push('cap');
  if (totalStars >= 25) out.push('glasses');
  if (bestStreak >= 3) out.push('cape');
  if (totalStars >= 60) out.push('crown');
  return out;
}

/* ---------------------------------------------------------------- */
/* ภารกิจประจำวัน                                                    */
/* ---------------------------------------------------------------- */

export interface TodayResult {
  mediaId: string;
  subject: string;
  stars: number;
  correct: number;
  total: number;
}

export interface MissionContext {
  results: TodayResult[];
  /** จำนวนเกม (ที่เล่นวันนี้) ซึ่งเป็นการเล่นครั้งแรกของเด็กคนนี้ */
  newMediaCount: number;
}

export interface MissionDef {
  key: string;
  title: string;
  target: number;
  reward: number;
  progress: (ctx: MissionContext) => number;
}

export const MISSION_POOL: MissionDef[] = [
  { key: 'play2', title: 'เล่นให้ครบ 2 รอบ', target: 2, reward: 2, progress: (c) => c.results.length },
  { key: 'stars3', title: 'เก็บให้ได้ 3 ดาว', target: 3, reward: 2, progress: (c) => c.results.reduce((a, r) => a + r.stars, 0) },
  { key: 'newgame', title: 'ลองเกมที่ยังไม่เคยเล่น', target: 1, reward: 3, progress: (c) => c.newMediaCount },
  { key: 'subjects2', title: 'เล่น 2 วิชาที่ต่างกัน', target: 2, reward: 3, progress: (c) => new Set(c.results.map((r) => r.subject)).size },
  {
    key: 'sharp',
    title: 'ตอบถูกเกิน 80% หนึ่งรอบ',
    target: 1,
    reward: 2,
    progress: (c) => c.results.filter((r) => r.total > 0 && r.correct / r.total >= 0.8).length,
  },
  { key: 'perfect', title: 'ได้ 3 ดาวหนึ่งรอบ', target: 1, reward: 3, progress: (c) => c.results.filter((r) => r.stars >= 3).length },
];

/** เลือกภารกิจ 3 ข้อของวันนั้น (เหมือนกันทุกคนในวันเดียวกัน) */
export function missionsForDay(day: string): MissionDef[] {
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;
  const start = seed % MISSION_POOL.length;
  // เลือก 3 ข้อห่างกัน เพื่อให้ผสมหลากหลายชนิด
  return [0, 2, 4].map((o) => MISSION_POOL[(start + o) % MISSION_POOL.length]);
}

/* ---------------------------------------------------------------- */
/* ตรา (Badges)                                                      */
/* ---------------------------------------------------------------- */

export interface BadgeContext {
  starsTotal: number;
  playsTotal: number;
  bestStreak: number;
  distinctMedia: number;
  distinctSubjects: number;
  hasPerfect: boolean;
}

export type BadgeTone = 'violet' | 'pink' | 'mint' | 'sky' | 'sun';

export interface BadgeDef {
  key: string;
  title: string;
  desc: string;
  tone: BadgeTone;
  icon: 'play' | 'flame' | 'star' | 'compass' | 'target' | 'palette';
  earned: (c: BadgeContext) => boolean;
}

export const BADGES: BadgeDef[] = [
  { key: 'first_play', title: 'ก้าวแรก', desc: 'เล่นเกมแรกสำเร็จ', tone: 'mint', icon: 'play', earned: (c) => c.playsTotal >= 1 },
  { key: 'perfect', title: 'เป๊ะเว่อร์', desc: 'ได้ 3 ดาวเต็ม', tone: 'sun', icon: 'target', earned: (c) => c.hasPerfect },
  { key: 'streak_3', title: 'ไฟลุก 3 วัน', desc: 'เล่นต่อเนื่อง 3 วัน', tone: 'pink', icon: 'flame', earned: (c) => c.bestStreak >= 3 },
  { key: 'streak_7', title: 'ไฟลุก 7 วัน', desc: 'เล่นต่อเนื่อง 7 วัน', tone: 'pink', icon: 'flame', earned: (c) => c.bestStreak >= 7 },
  { key: 'stars_10', title: 'นักสะสมดาว', desc: 'สะสมครบ 10 ดาว', tone: 'sun', icon: 'star', earned: (c) => c.starsTotal >= 10 },
  { key: 'stars_50', title: 'ดาวเต็มท้องฟ้า', desc: 'สะสมครบ 50 ดาว', tone: 'sun', icon: 'star', earned: (c) => c.starsTotal >= 50 },
  { key: 'stars_100', title: 'จักรวาลดาว', desc: 'สะสมครบ 100 ดาว', tone: 'violet', icon: 'star', earned: (c) => c.starsTotal >= 100 },
  { key: 'explorer_3', title: 'นักสำรวจ', desc: 'ลองเล่น 3 เกมที่ต่างกัน', tone: 'sky', icon: 'compass', earned: (c) => c.distinctMedia >= 3 },
  { key: 'explorer_8', title: 'นักสำรวจตัวจริง', desc: 'ลองเล่น 8 เกมที่ต่างกัน', tone: 'sky', icon: 'compass', earned: (c) => c.distinctMedia >= 8 },
  { key: 'all_subjects', title: 'เก่งรอบด้าน', desc: 'เล่นครบ 3 วิชา', tone: 'violet', icon: 'palette', earned: (c) => c.distinctSubjects >= 3 },
];

export function newlyEarnedBadges(ctx: BadgeContext, already: Set<string>): BadgeDef[] {
  return BADGES.filter((b) => !already.has(b.key) && b.earned(ctx));
}
