/** ค่าที่ตั้งก่อนเล่นสงครามอวกาศ AR (ส่งผ่าน URL ของหน้า /play/ar ไม่เก็บในฐานข้อมูล) */
export interface ArSettings {
  /** 0 = เดี่ยว, 2 = 2 ทีม */
  teams: number;
  /** จำนวนข้อ (0 = ทั้งชุด) */
  count: number;
  /** วินาทีต่อข้อ (0 = ตามชุดคำถาม อย่างน้อย 20 วินาที) */
  time: number;
  /** 0 ง่าย / 1 ปกติ / 2 ยาก: ยานลอยไปมามากขึ้น อุกกาบาตเร็วขึ้น */
  level: number;
  music: string;
}

export const AR_DEFAULTS: ArSettings = { teams: 0, count: 10, time: 0, level: 1, music: 'auto' };
export const AR_COUNTS = [5, 10, 15, 20, 0];
export const AR_TIMES = [0, 20, 30, 45];
export const AR_LEVELS = ['ง่าย', 'ปกติ', 'ยาก'];

const pick = (v: unknown, ok: number[], d: number) => {
  const n = Number(v);
  return ok.includes(n) ? n : d;
};

/** อ่านค่าจาก URL (ค่าแปลกปลอม = ค่าเริ่มต้น) */
export function parseArSettings(get: (k: string) => string | null): ArSettings {
  const music = get('music') || 'auto';
  return {
    teams: pick(get('teams'), [0, 2], AR_DEFAULTS.teams),
    count: pick(get('n'), AR_COUNTS, AR_DEFAULTS.count),
    time: pick(get('t'), AR_TIMES, AR_DEFAULTS.time),
    level: pick(get('lv'), [0, 1, 2], AR_DEFAULTS.level),
    music: /^[a-z0-9_-]{1,24}$/.test(music) ? music : 'auto',
  };
}

export function arQuery(gameId: string, s: ArSettings): string {
  return new URLSearchParams({ id: gameId, teams: String(s.teams), n: String(s.count), t: String(s.time), lv: String(s.level), music: s.music }).toString();
}
