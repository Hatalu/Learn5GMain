/**
 * มนุษย์สร้างรูป: ค่าตั้ง (ส่งผ่าน URL ของ /play/shape) + ท่าประจำตัวเลือก + คะแนน
 * ทุกกลุ่มทำท่าของตัวเลือกที่ตอบ ครูมองแล้วแตะกลุ่มที่ตอบถูกเอง
 */

export interface ShapeSettings {
  teams: number;
  /** จำนวนข้อ (0 = ทั้งชุด) */
  count: number;
  /** นับอันดับตอบก่อน-หลังหรือไม่ */
  order: boolean;
  music: string;
}

export const SHAPE_TEAMS = [2, 3, 4, 5, 6, 8, 10];
export const SHAPE_COUNTS = [5, 10, 15, 20, 0];
export const SHAPE_DEFAULTS: ShapeSettings = { teams: 4, count: 0, order: true, music: 'auto' };

export function parseShapeSettings(get: (k: string) => string | null): ShapeSettings {
  const num = (k: string, ok: number[], d: number) => {
    const v = get(k);
    return v !== null && v !== '' && ok.includes(Number(v)) ? Number(v) : d;
  };
  const music = get('music') || 'auto';
  return {
    teams: num('teams', SHAPE_TEAMS, SHAPE_DEFAULTS.teams),
    count: num('n', SHAPE_COUNTS, SHAPE_DEFAULTS.count),
    order: get('ord') === null ? SHAPE_DEFAULTS.order : get('ord') === '1',
    music: /^[a-z0-9_-]{1,24}$/.test(music) ? music : 'auto',
  };
}

export function shapeQuery(gameId: string, s: ShapeSettings): string {
  return new URLSearchParams({ id: gameId, teams: String(s.teams), n: String(s.count), ord: s.order ? '1' : '0', music: s.music }).toString();
}

export const teamName = (i: number) => `ทีม ${String.fromCharCode(65 + i)}`;

/* ------------------------------ ท่าประจำตัวเลือก ------------------------------ */

/** มุมแขน [ต้นแขน, ปลายแขนเทียบต้นแขน] และขา (องศา, 0 = ชี้ลง) dy = ตัวต่ำลง */
export interface PoseDef {
  name: string;
  la: [number, number];
  ra: [number, number];
  ll: number;
  rl: number;
  dy: number;
}

export const STAND: PoseDef = { name: 'ยืนตรง', la: [8, 0], ra: [-8, 0], ll: 4, rl: -4, dy: 0 };

/** ตัวเลือกที่ 1-6 (ชุดคำถามมีได้สูงสุด 6 ตัวเลือก) ท่าปลอดภัย ไม่ต้องแตะตัวเพื่อน มองจากไกลก็แยกออก */
export const CHOICE_POSES: PoseDef[] = [
  { name: 'ชูแขนเป็นตัว V', la: [145, 0], ra: [-145, 0], ll: 4, rl: -4, dy: 0 },
  { name: 'กางแขนออกข้าง', la: [90, 0], ra: [-90, 0], ll: 4, rl: -4, dy: 0 },
  { name: 'มือแตะหัว', la: [150, 72], ra: [-150, -72], ll: 4, rl: -4, dy: 0 },
  { name: 'นั่งลงกับพื้น', la: [24, 0], ra: [-24, 0], ll: 78, rl: -78, dy: 16 },
  { name: 'งอศอกแบบหุ่นยนต์', la: [90, 90], ra: [-90, -90], ll: 10, rl: -10, dy: 0 },
  { name: 'กางแขนกางขาเป็นดาว', la: [128, 0], ra: [-128, 0], ll: 26, rl: -26, dy: 3 },
];

/* ------------------------------ คะแนน ------------------------------ */

/** ผลหนึ่งข้อ: teams = ทีมที่ตอบถูกเรียงตามลำดับที่ครูแตะ */
export interface Round {
  teams: number[];
  order: boolean;
}

/** ไม่นับอันดับ = ถูกได้ 10 / นับอันดับ = ที่ 1 ได้ 10, 8, 6 แล้วทีมต่อไปได้ 5 (rank เริ่มที่ 0) */
export const pointsFor = (rank: number, order: boolean) => (order ? Math.max(5, 10 - 2 * rank) : 10);

/** แตะทีม: ยังไม่เลือก = ต่อท้าย, เลือกแล้ว = เอาออก (ทีมหลังขยับอันดับขึ้น) */
export const toggleTeam = (list: number[], t: number) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);

export function totals(rounds: Round[], teams: number): number[] {
  const out: number[] = Array.from({ length: teams }, () => 0);
  for (const r of rounds) r.teams.forEach((t, rank) => (out[t] += pointsFor(rank, r.order)));
  return out;
}

/** อันดับรวม (คะแนนเท่ากัน = อันดับเดียวกัน) */
export const ranks = (scores: number[]) => scores.map((s) => 1 + scores.filter((x) => x > s).length);
