/**
 * ภารกิจประจำวัน + ภารกิจสะสม (ตรรกะล้วน) ความคืบหน้ามาจากตัวนับเหตุการณ์จริงในเกมเท่านั้น
 * - ประจำวัน: สุ่ม 3 ภารกิจต่อวันจากวันที่ (ทุกเครื่องได้ชุดเดียวกันในวันเดียวกัน) ครูตั้งชุดเองได้
 * - สะสม: เป้าหมายตลอดการเล่นในเครื่องนี้
 */
export type MType = 'correct' | 'firstTry' | 'combo' | 'meteor' | 'boss' | 'dodge' | 'shield' | 'perfect' | 'games';

/** ตัวนับ: combo เก็บค่าสูงสุด ที่เหลือเป็นผลรวม */
export type Stats = Record<MType, number>;
export const ZERO_STATS: Stats = { correct: 0, firstTry: 0, combo: 0, meteor: 0, boss: 0, dodge: 0, shield: 0, perfect: 0, games: 0 };
export const M_TYPES = Object.keys(ZERO_STATS) as MType[];

export const M_TEXT: Record<MType, (n: number) => string> = {
  correct: (n) => `ตอบถูก ${n} ข้อ`,
  firstTry: (n) => `ตอบถูกตั้งแต่ครั้งแรก ${n} ข้อ`,
  combo: (n) => `ตอบถูกติดกัน ${n} ข้อ`,
  meteor: (n) => `ยิงอุกกาบาต ${n} ลูก`,
  boss: (n) => `ชนะบอส ${n} ตัว`,
  dodge: (n) => `หลบการโจมตีบอส ${n} ครั้ง`,
  shield: (n) => `ใช้โล่สองมือกันการโจมตี ${n} ครั้ง`,
  perfect: (n) => `ทำ Perfect ${n} ข้อ`,
  games: (n) => `เล่นจบ ${n} ด่าน`,
};

export const M_NAME: Record<MType, string> = {
  correct: 'ตอบถูก (ข้อ)',
  firstTry: 'ถูกตั้งแต่ครั้งแรก (ข้อ)',
  combo: 'ตอบถูกติดกัน (ข้อ)',
  meteor: 'ยิงอุกกาบาต (ลูก)',
  boss: 'ชนะบอส (ตัว)',
  dodge: 'หลบการโจมตี (ครั้ง)',
  shield: 'ใช้โล่สองมือ (ครั้ง)',
  perfect: 'ทำ Perfect (ข้อ)',
  games: 'เล่นจบ (ด่าน)',
};

export interface MissionDef {
  type: MType;
  target: number;
  reward: number;
}

const DAILY_POOL: MissionDef[] = [
  { type: 'correct', target: 10, reward: 20 },
  { type: 'correct', target: 20, reward: 35 },
  { type: 'firstTry', target: 8, reward: 30 },
  { type: 'combo', target: 4, reward: 25 },
  { type: 'meteor', target: 25, reward: 20 },
  { type: 'boss', target: 1, reward: 40 },
  { type: 'dodge', target: 5, reward: 25 },
  { type: 'shield', target: 2, reward: 25 },
  { type: 'perfect', target: 3, reward: 30 },
  { type: 'games', target: 2, reward: 20 },
];

export const ACHIEVEMENTS: (MissionDef & { id: string })[] = [
  { id: 'c50', type: 'correct', target: 50, reward: 60 },
  { id: 'c200', type: 'correct', target: 200, reward: 150 },
  { id: 'b1', type: 'boss', target: 1, reward: 50 },
  { id: 'b10', type: 'boss', target: 10, reward: 200 },
  { id: 'm100', type: 'meteor', target: 100, reward: 60 },
  { id: 'd30', type: 'dodge', target: 30, reward: 80 },
  { id: 'p20', type: 'perfect', target: 20, reward: 100 },
  { id: 'k8', type: 'combo', target: 8, reward: 80 },
];

/** วันที่ตามเวลาเครื่อง YYYY-MM-DD */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** ภารกิจของวันนั้น: ครูตั้งเอง (custom) ใช้ชุดนั้น ไม่งั้นสุ่ม 3 แบบไม่ซ้ำประเภท */
export function dailyFor(day: string, custom?: MissionDef[] | null): MissionDef[] {
  if (custom?.length) return custom.slice(0, 5);
  let seed = hash(day);
  const pool = DAILY_POOL.slice();
  const out: MissionDef[] = [];
  while (out.length < 3 && pool.length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const m = pool.splice(seed % pool.length, 1)[0];
    if (!out.some((o) => o.type === m.type)) out.push(m);
  }
  return out;
}

export function cleanMission(v: unknown): MissionDef | null {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const type = o.type as MType;
  if (!M_TYPES.includes(type)) return null;
  const target = Math.max(1, Math.min(500, Math.floor(Number(o.target) || 0)));
  const reward = Math.max(5, Math.min(200, Math.floor(Number(o.reward) || 0)));
  return { type, target, reward };
}

export function cleanStats(v: unknown): Stats {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = { ...ZERO_STATS };
  for (const k of M_TYPES) s[k] = Math.max(0, Math.floor(Number(o[k]) || 0));
  return s;
}

/** รวมตัวนับ: combo = ค่าสูงสุด อื่นๆ = บวก */
export function addStats(a: Stats, b: Partial<Stats>): Stats {
  const s = { ...a };
  for (const k of M_TYPES) {
    const v = b[k] || 0;
    s[k] = k === 'combo' ? Math.max(s[k], v) : s[k] + v;
  }
  return s;
}

/* ------------------------------ ภารกิจในด่าน (รวมภารกิจร่วมมือของทีม) ------------------------------ */

export type QuestKind = 'allCorrect' | 'teamDodge' | 'bossDown' | 'combo' | 'perfect';
export interface Quest {
  kind: QuestKind;
  target: number;
  text: string;
  coop: boolean;
}

/** ภารกิจของด่าน: เดี่ยว = ฝีมือตัวเอง / หลายทีม = ต้องร่วมมือกันทุกทีม */
export function stageQuests(teams: number, hasBoss: boolean): Quest[] {
  const q: Quest[] =
    teams >= 2
      ? [
          { kind: 'allCorrect', target: 3, text: 'ทุกทีมตอบถูกพร้อมกัน 3 รอบ', coop: true },
          { kind: 'teamDodge', target: 6, text: 'ทุกทีมรวมกันหลบการโจมตี 6 ครั้ง', coop: true },
        ]
      : [
          { kind: 'combo', target: 3, text: 'ตอบถูกติดกัน 3 ข้อ', coop: false },
          { kind: 'perfect', target: 2, text: 'ทำ Perfect 2 ข้อ', coop: false },
        ];
  if (hasBoss) q.push({ kind: 'bossDown', target: 1, text: teams >= 2 ? 'ทุกทีมช่วยกันล้มบอส' : 'ล้มบอสให้ได้', coop: teams >= 2 });
  return q;
}

/** ทุกทีมตอบถูกพร้อมกัน: จอแบ่ง = ทั้งสองฝั่งถูกในข้อเดียวกัน / ผลัดกัน = ครบหนึ่งรอบทุกทีมถูกหมด */
export function allCorrectRounds(gotByQuestion: boolean[][], teams: number, relay: boolean): number {
  if (!relay) return gotByQuestion.filter((g) => g.length >= 2 && g.every(Boolean)).length;
  let n = 0;
  for (let i = 0; i + teams <= gotByQuestion.length; i += teams) if (gotByQuestion.slice(i, i + teams).every((g) => g[0])) n++;
  return n;
}

export const progress = (m: MissionDef, s: Stats) => Math.min(m.target, s[m.type]);
export const done = (m: MissionDef, s: Stats) => s[m.type] >= m.target;
