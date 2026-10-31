import { ALL_MOTIONS, DEFAULT_MOTIONS } from './ar/gestures';
import { BOSSES } from './ar/boss';

/** ค่าที่ตั้งก่อนเล่นสงครามอวกาศ AR (ส่งผ่าน URL ของหน้า /play/ar ไม่เก็บในฐานข้อมูล) ครูปรับต่อได้ในแผงครูระหว่างเล่น */
export interface ArSettings {
  /** 0 = เดี่ยว, 2 = 2 ทีม (จอแบ่ง), 3-4 = ผลัดกันเล่น */
  teams: number;
  /** สมาชิกต่อทีม (สลับผู้ควบคุมยานทุกข้อ) */
  members: number;
  /** จำนวนข้อ (0 = ทั้งชุด) */
  count: number;
  /** วินาทีต่อข้อ (0 = ตามชุดคำถาม อย่างน้อย 20 วินาที) */
  time: number;
  /** 0 ง่าย / 1 ปกติ / 2 ยาก / 3 ตามด่านในแผนที่ */
  level: number;
  /** 'auto' = ตามด่าน หรือ id บอส */
  boss: string;
  /** ท่าที่เปิด (บิตตาม MOTIONS) */
  motions: number;
  /** ความไวการตรวจท่า 0-2 */
  sens: number;
  music: string;
  /** แบบการเล่น (Magic Kingdom): 0 ผจญภัย / 1 แข่งเวลา / 2 บอสรัว */
  style: number;
}

export const AR_DEFAULTS: ArSettings = { teams: 0, members: 1, count: 10, time: 0, level: 3, boss: 'auto', motions: DEFAULT_MOTIONS, sens: 1, music: 'auto', style: 0 };
export const AR_STYLES = ['ผจญภัย (คำถาม + บอส)', 'แข่งเวลา 2 นาที', 'บอสรัว (Boss Rush)'];
export const AR_TEAMS = [0, 2, 3, 4];
export const AR_MEMBERS = [1, 2, 3, 4, 5, 6];
export const AR_COUNTS = [5, 10, 15, 20, 0];
export const AR_TIMES = [0, 20, 30, 45];
export const AR_LEVELS = ['ง่าย', 'ปกติ', 'ยาก', 'ตามด่าน'];

const pick = (v: unknown, ok: number[], d: number) => {
  const n = Number(v);
  return v !== null && v !== '' && ok.includes(n) ? n : d;
};

/** อ่านค่าจาก URL (ค่าแปลกปลอม = ค่าเริ่มต้น) */
export function parseArSettings(get: (k: string) => string | null, bossIds: string[] = BOSSES.map((x) => x.id)): ArSettings {
  const music = get('music') || 'auto';
  const boss = get('b') || 'auto';
  const mo = Number(get('mo'));
  return {
    teams: pick(get('teams'), AR_TEAMS, AR_DEFAULTS.teams),
    members: pick(get('m'), AR_MEMBERS, AR_DEFAULTS.members),
    count: pick(get('n'), AR_COUNTS, AR_DEFAULTS.count),
    time: pick(get('t'), AR_TIMES, AR_DEFAULTS.time),
    level: pick(get('lv'), [0, 1, 2, 3], AR_DEFAULTS.level),
    boss: boss === 'auto' || bossIds.includes(boss) ? boss : 'auto',
    motions: get('mo') !== null && Number.isInteger(mo) && mo >= 0 && mo <= ALL_MOTIONS ? mo : AR_DEFAULTS.motions,
    sens: pick(get('sn'), [0, 1, 2], AR_DEFAULTS.sens),
    music: /^[a-z0-9_-]{1,24}$/.test(music) ? music : 'auto',
    style: pick(get('st'), [0, 1, 2], AR_DEFAULTS.style),
  };
}

export function arQuery(gameId: string, s: ArSettings): string {
  return new URLSearchParams({
    id: gameId,
    teams: String(s.teams),
    m: String(s.members),
    n: String(s.count),
    t: String(s.time),
    lv: String(s.level),
    b: s.boss,
    mo: String(s.motions),
    sn: String(s.sens),
    music: s.music,
    st: String(s.style),
  }).toString();
}
