/**
 * เวลาไทย ช่วงเวลาของวัน ฤดู และวันสำคัญ (ฟังก์ชันล้วน ใช้ทั้ง client และเทสต์)
 */

export const TZ = 'Asia/Bangkok';

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
