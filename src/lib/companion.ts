/**
 * ตรรกะของ "ปุ๋ง" ตัวละครคู่หู + เวลา/ฤดู/วันสำคัญ + สติกเกอร์ + เกมประจำวัน
 * ฟังก์ชันล้วน (ไม่แตะ DOM/localStorage) ใช้ได้ทั้ง client และเทสต์
 */

export const TZ = 'Asia/Bangkok';
export const BUDDY_NAME = 'ปุ๋ง';

/* ------------------------------------------------------------------ */
/* เวลาไทย                                                             */
/* ------------------------------------------------------------------ */

export interface BkkParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = อาทิตย์
  date: string; // YYYY-MM-DD
}

const WEEKDAY_IDX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const WEEKDAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export function bkkParts(d: Date = new Date()): BkkParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '0';
  const hour = Number(get('hour')) % 24;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  return {
    year,
    month,
    day,
    hour,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAY_IDX[get('weekday')] ?? 0,
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

/** มิลลิวินาทีที่เหลือจนถึงเที่ยงคืนเวลาไทย */
export function msUntilMidnight(p: BkkParts): number {
  return ((23 - p.hour) * 3600 + (59 - p.minute) * 60 + (60 - p.second)) * 1000;
}

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
export function phaseOf(hour: number): Phase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

export type Season = 'hot' | 'rainy' | 'cool';
/** ฤดูของไทย: ร้อน มี.ค.-พ.ค., ฝน มิ.ย.-ต.ค., หนาว พ.ย.-ก.พ. */
export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'hot';
  if (month >= 6 && month <= 10) return 'rainy';
  return 'cool';
}

export type EventKey = 'songkran' | 'krathong' | 'newyear' | 'teacher' | 'children' | 'mother' | 'father';
export interface SpecialEvent {
  key: EventKey;
  label: string;
  /** ข้อความทักทายประจำวันสำคัญ */
  greeting: string;
}

// ลอยกระทงเป็นวันตามจันทรคติ ระบุเฉพาะปีที่แน่ใจ (เพิ่มปีถัดไปได้ที่นี่)
const LOY_KRATHONG: Record<number, string> = { 2026: '11-24' };

/** วันสำคัญที่ธีมพิเศษจะขึ้น (เวลาไทย) */
export function eventOf(p: BkkParts): SpecialEvent | null {
  const { month, day, year, weekday } = p;
  if (month === 4 && day >= 13 && day <= 15)
    return { key: 'songkran', label: 'สงกรานต์', greeting: 'สุขสันต์วันสงกรานต์! สาดน้ำเบาๆ นะ' };
  if ((month === 12 && day === 31) || (month === 1 && day === 1))
    return { key: 'newyear', label: 'ปีใหม่', greeting: 'สวัสดีปีใหม่! ปีนี้ไปผจญภัยด้วยกันนะ' };
  if (month === 1 && day === 16)
    return { key: 'teacher', label: 'วันครู', greeting: 'วันครู! ขอบคุณคุณครูทุกคนที่คอยสอนเรา' };
  if (month === 8 && day === 12)
    return { key: 'mother', label: 'วันแม่', greeting: 'วันแม่! อย่าลืมกอดแม่ด้วยนะ' };
  if (month === 12 && day === 5)
    return { key: 'father', label: 'วันพ่อ', greeting: 'วันพ่อ! อย่าลืมบอกรักพ่อนะ' };
  if (LOY_KRATHONG[year] === `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    return { key: 'krathong', label: 'ลอยกระทง', greeting: 'สุขสันต์วันลอยกระทง! กระทงลอยสวยเลย' };
  if (month === 1 && weekday === 6) {
    // วันเด็กแห่งชาติ = วันเสาร์ที่สองของเดือนมกราคม
    const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay();
    const firstSat = 1 + ((6 - jan1 + 7) % 7);
    if (day === firstSat + 7)
      return { key: 'children', label: 'วันเด็ก', greeting: 'สุขสันต์วันเด็ก! วันนี้เป็นวันของเธอเลย' };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* ดาวและตัวละคร                                                        */
/* ------------------------------------------------------------------ */

export const BUDDY_STAGES = [
  { min: 0, name: 'ไข่มหัศจรรย์' },
  { min: 12, name: 'ลูกน้อยจอมซน' },
  { min: 40, name: 'นักผจญภัย' },
  { min: 90, name: 'ฮีโร่แห่ง 5G' },
] as const;

export function buddyStage(stars: number): { index: number; name: string; from: number; next: number | null } {
  let index = 0;
  BUDDY_STAGES.forEach((s, i) => {
    if (stars >= s.min) index = i;
  });
  return {
    index,
    name: BUDDY_STAGES[index].name,
    from: BUDDY_STAGES[index].min,
    next: index < BUDDY_STAGES.length - 1 ? BUDDY_STAGES[index + 1].min : null,
  };
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
export const COLOR_LABEL: Record<BuddyColor, string> = {
  violet: 'ม่วง',
  pink: 'ชมพู',
  mint: 'มิ้นต์',
  sky: 'ฟ้า',
  sun: 'เหลือง',
  coral: 'ส้ม',
};

export const HATS = ['none', 'cap', 'glasses', 'cape', 'crown'] as const;
export type Hat = (typeof HATS)[number];
export const HAT_INFO: Record<Hat, { label: string; hint: string }> = {
  none: { label: 'ไม่ใส่', hint: '' },
  cap: { label: 'หมวกนักผจญภัย', hint: 'ตัวละครโตเป็นลูกน้อย (12 ดาว)' },
  glasses: { label: 'แว่นนักคิด', hint: 'สะสมครบ 25 ดาว' },
  cape: { label: 'ผ้าคลุมฮีโร่', hint: 'มาเยี่ยมครบ 3 วัน' },
  crown: { label: 'มงกุฎดาว', hint: 'สะสมครบ 60 ดาว' },
};

export function unlockedHats(stars: number, visitDays: number): Hat[] {
  const out: Hat[] = ['none'];
  if (stars >= BUDDY_STAGES[1].min) out.push('cap');
  if (stars >= 25) out.push('glasses');
  if (visitDays >= 3) out.push('cape');
  if (stars >= 60) out.push('crown');
  return out;
}

/* ------------------------------------------------------------------ */
/* สติกเกอร์                                                            */
/* ------------------------------------------------------------------ */

export type StickerTier = 0 | 1 | 2 | 3;
export const TIER_INFO: Record<StickerTier, { label: string; need: number }> = {
  0: { label: 'ยังไม่ได้', need: 1 },
  1: { label: 'สติกเกอร์', need: 1 },
  2: { label: 'ระดับเงิน', need: 3 },
  3: { label: 'ระดับทอง', need: 5 },
};

/** ระดับสติกเกอร์จากจำนวนครั้งที่เล่น: 1 ครั้ง = ได้สติกเกอร์, 3 = เงิน, 5 = ทอง */
export function stickerTier(plays: number): StickerTier {
  if (plays >= 5) return 3;
  if (plays >= 3) return 2;
  if (plays >= 1) return 1;
  return 0;
}

/** นับเป็นการเล่นใหม่ได้เมื่อห่างจากครั้งก่อนอย่างน้อยกี่นาที (กันกดรัวปั่นดาว) */
export const PLAY_COOLDOWN_MIN = 10;

export const STAR_RULES = {
  firstPlay: 2,
  repeatPlay: 1,
  tierUp: 2,
  dailyGame: 3,
  checkin: 1,
} as const;

/* ------------------------------------------------------------------ */
/* เกมประจำวัน                                                          */
/* ------------------------------------------------------------------ */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shiftDate(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
export { shiftDate };

function epochDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * เลือกเกมอัตโนมัติเมื่อแอดมินไม่ได้ตั้งไว้ ทุกคนเห็นตรงกันในวันเดียวกัน
 * วิธี: แบ่งวันเป็นรอบละ n วัน (n = จำนวนเกม) แต่ละรอบสับลำดับเกมด้วย hash
 * จึงเล่นครบทุกเกมก่อนวนซ้ำ และไม่มีวันไหนซ้ำกับเมื่อวาน (แม้ตรงรอยต่อของรอบ)
 */
export function autoPickDaily<T extends { id: string }>(items: T[], date: string): T | null {
  const n = items.length;
  if (n === 0) return null;
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  if (n === 1) return sorted[0];
  const day = epochDay(date);
  if (n === 2) return sorted[day % 2];

  const perm = (cycle: number) =>
    [...sorted].sort((a, b) => hashStr(`${cycle}:${a.id}`) - hashStr(`${cycle}:${b.id}`) || a.id.localeCompare(b.id));

  const cycle = Math.floor(day / n);
  const pos = day % n;
  const arr = perm(cycle);
  // รอยต่อรอบ: ถ้าเกมแรกของรอบนี้ซ้ำกับเกมสุดท้ายของรอบก่อน สลับ 2 ตัวแรก (n >= 3 จึงไม่กระทบตัวสุดท้าย)
  if (pos <= 1 && arr[0].id === perm(cycle - 1)[n - 1].id) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr[pos];
}

/* ------------------------------------------------------------------ */
/* คำทักทาย                                                             */
/* ------------------------------------------------------------------ */

export interface GreetContext {
  parts: BkkParts;
  phase: Phase;
  event: SpecialEvent | null;
  firstVisit: boolean;
  visitDays: number;
  lastPlayed: { title: string; day: string } | null;
  dailyTitle: string | null;
  dailyPlayedToday: boolean;
  checkinStars: number;
  stage: number;
}

function timeSalutation(phase: Phase, hour: number): string {
  if (phase === 'dawn') return 'อรุณสวัสดิ์';
  if (phase === 'day') return hour < 11 ? 'สวัสดีตอนเช้า' : hour < 13 ? 'สวัสดีตอนเที่ยง' : 'สวัสดีตอนบ่าย';
  if (phase === 'dusk') return 'สวัสดีตอนเย็น';
  return hour >= 22 || hour < 4 ? 'ราตรีสวัสดิ์' : 'สวัสดีตอนค่ำ';
}

/** คำทักทายสั้นๆ 1 ความคิด/บรรทัด (ตามกฎ: ข้อความสั้น ไม่ยาว) */
export function buildGreeting(c: GreetContext): string[] {
  const lines: string[] = [];

  if (c.firstVisit) {
    return [`สวัสดี! ฉันชื่อ${BUDDY_NAME} เป็นคู่หูผจญภัยของเธอ`, 'เล่นเกมเพื่อสะสมดาว แล้วฉันจะโตขึ้นนะ'];
  }

  if (c.event) {
    lines.push(c.event.greeting);
  } else {
    lines.push(`${timeSalutation(c.phase, c.parts.hour)}! วันนี้วัน${WEEKDAY_TH[c.parts.weekday]}`);
  }

  if (c.phase === 'night' && (c.parts.hour >= 21 || c.parts.hour < 5)) {
    lines.push('ดึกแล้ว พักสายตาและนอนหลับให้เต็มอิ่มนะ');
    return lines.slice(0, 2);
  }

  if (c.checkinStars > 0) {
    lines.push(`ดีใจที่เธอมาอีก! ได้ดาวเช็คอิน +${c.checkinStars}`);
  } else if (c.dailyTitle && !c.dailyPlayedToday) {
    lines.push(`เกมประจำวันคือ "${c.dailyTitle}" ไปเล่นกันไหม`);
  } else if (c.lastPlayed) {
    const yesterday = shiftDate(c.parts.date, -1);
    const when = c.lastPlayed.day === c.parts.date ? 'วันนี้' : c.lastPlayed.day === yesterday ? 'เมื่อวาน' : 'ครั้งก่อน';
    lines.push(`${when}เล่น "${c.lastPlayed.title}" นะ อยากเล่นต่อไหม`);
  } else if (c.dailyTitle) {
    lines.push(`วันนี้ลองเล่น "${c.dailyTitle}" ดูไหม`);
  } else {
    lines.push('วันนี้อยากผจญภัยกับวิชาอะไรดี');
  }
  return lines.slice(0, 2);
}

/** ข้อความที่ปุ๋งพูดตอนเด็กกดคุยด้วย (หมุนเวียน) */
export const CHATTER = [
  'เล่นเกมให้ได้ดาว ฉันจะได้โตไวๆ',
  'กดเข้าห้องของฉัน แล้วเปลี่ยนสีหรือใส่หมวกได้นะ',
  'เล่นเกมเดิมซ้ำ จะได้สติกเกอร์เงินกับทอง',
  'พักสายตาบ้างนะ มองไกลๆ 20 วินาที',
  'มาทุกวัน ฉันจะปลดล็อกผ้าคลุมฮีโร่ให้',
];
