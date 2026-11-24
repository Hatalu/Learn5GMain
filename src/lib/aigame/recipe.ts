/**
 * ตัวเลือกของครูในคลังเกม (วิชา/ชั้น/เรื่อง/แหล่งคำถาม/ความเร็ว/เวลา/หัวใจ/ภาษา) + ตัวแปลงชุดคำถามเป็นข้อแบบเรียบ
 * ฟังก์ชันล้วน ไม่แตะ DOM (selftest เรียกได้)
 */
import { GRADES, LANGS, LEVELS, SUBJECTS, subjectOf, type SubjectId } from './options';
import { richToPlain } from '@/lib/game-creator/quiz';
import type { QuizContent } from '@/lib/game-creator/types';
import { AI_GAMES, gameById } from './games';

/** ข้อแบบเรียบที่ใช้ในเกม */
export interface GItem {
  q: string;
  /** ตัวเลือก (ข้อพิมพ์คำตอบ = ว่าง) */
  choices: string[];
  /** ลำดับตัวเลือกที่ถูก (มากกว่า 1 = ต้องเลือกครบ) */
  correct: number[];
  /** คำตอบที่ยอมรับ (ข้อพิมพ์คำตอบ ใช้ในเกมไม่ได้) */
  accept?: string[];
  /** ต้นฉบับมีรูป/คลิปประกอบที่ไม่ได้แนบไปด้วย */
  media?: boolean;
  /** ข้อเรียงลำดับ: choices เรียงถูกแล้ว ต้องเลือกตามลำดับ correct */
  ordered?: boolean;
}

/** แหล่งเนื้อหา: auto = เนื้อหาของเว็บตามวิชา/ชั้น/เรื่อง, bank = เลือกชุดจากคลัง, mine = ชุดของครู */
export type Source = 'auto' | 'bank' | 'mine';

interface Opt<T extends string | number = string> {
  id: T;
  th: string;
  sub?: string;
}

/** ความเร็วเกม: f = ตัวคูณเวลา (มาก = ช้า) */
export const PACES = [
  { id: 'calm', th: 'ช้า สบายๆ', sub: 'ป.1-2', f: 1.4, up: 1.15, read: 4, perChar: 0.08 },
  { id: 'normal', th: 'ปกติ', f: 1, up: 1.25, read: 3, perChar: 0.06 },
  { id: 'fast', th: 'เร็ว ท้าทาย', sub: 'ทบทวน', f: 0.75, up: 1.4, read: 2.5, perChar: 0.05 },
] as const;
export type PaceId = (typeof PACES)[number]['id'];

export const TIMERS: Opt<number>[] = [
  { id: 0, th: 'ไม่จับเวลา' },
  { id: 30, th: '30 วิ' },
  { id: 20, th: '20 วิ' },
];

export const LIVES: Opt[] = [
  { id: 'off', th: 'ไม่มีหัวใจ' },
  { id: 'on', th: '3 หัวใจ' },
];

/** ผู้เล่น: คนเดียว / 2 ทีมผลัดกันตอบบนจอเดียว (โปรเจกเตอร์) */
export const TEAMS: Opt<number>[] = [
  { id: 0, th: 'เล่นคนเดียว' },
  { id: 2, th: '2 ทีมแข่งกัน', sub: 'ผลัดกันตอบ' },
];

/** วิธีตอบ: แตะเลือก หรือเล็ง/กะจังหวะเอง (เกมที่มี aim ใน games.ts) */
export const AIMS: Opt<number>[] = [
  { id: 0, th: 'แตะเลือกคำตอบ', sub: 'ง่าย' },
  { id: 1, th: 'เล็ง/กะจังหวะเอง', sub: 'ท้าทาย' },
];

/** ภาพ: คุณภาพ (ลื่น = เครื่องช้า) และบรรยากาศ */
export const GFXS: Opt<number>[] = [
  { id: 0, th: 'ลื่น', sub: 'เครื่องช้า' },
  { id: 1, th: 'ปกติ' },
  { id: 2, th: 'คมชัด', sub: 'เครื่องแรง' },
];
export const MOODS: Opt<number>[] = [
  { id: 0, th: 'กลางวัน' },
  { id: 1, th: 'ยามเย็น' },
  { id: 2, th: 'กลางคืน' },
];

export interface GameRecipe {
  game: string;
  s: SubjectId;
  g: number;
  /** id เรื่องใน SUBJECTS ('' = ทั่วไป) */
  topic: string;
  custom: string;
  lv: (typeof LEVELS)[number]['id'];
  lang: (typeof LANGS)[number]['id'];
  /** จำนวนข้อในเกม */
  count: number;
  source: Source;
  pace: PaceId;
  /** วินาทีต่อข้อ (0 = ไม่จับเวลา) */
  timer: number;
  lives: 'off' | 'on';
  teams: number;
  aim: number;
  gfx: number;
  mood: number;
}

export const COUNT_OPTIONS = [5, 10, 15, 20];

export const defaultGameRecipe = (game = AI_GAMES[0].id): GameRecipe => ({
  game,
  s: 'math',
  g: 3,
  topic: 'mult',
  custom: '',
  lv: 'easy',
  lang: 'th',
  count: 10,
  source: 'auto',
  pace: 'normal',
  timer: 0,
  lives: 'off',
  teams: 0,
  aim: 0,
  gfx: 1,
  mood: 0,
});

/** เรื่องที่เหมาะกับชั้นนี้ (ถ้าไม่มีเลยคืนทั้งหมดของวิชา) */
export function topicsFor(s: SubjectId, g: number) {
  const all = subjectOf(s).topics;
  const fit = all.filter((t) => g >= t.g[0] && g <= t.g[1]);
  return fit.length ? fit : all;
}

const pick = <T extends string | number>(list: readonly { id: T }[], v: unknown, d: T): T => (list.some((x) => x.id === v) ? (v as T) : d);

export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[^฀-๿぀-ヿ一-鿿A-Za-z0-9 .,!?()+\-=/:%×÷]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanGameRecipe(raw: Partial<GameRecipe>): GameRecipe {
  const d = defaultGameRecipe();
  const s = SUBJECTS.some((x) => x.id === raw.s) ? (raw.s as SubjectId) : d.s;
  const g = GRADES.includes(Number(raw.g)) ? Number(raw.g) : d.g;
  const topics = subjectOf(s).topics;
  const act = gameById(raw.game)?.act ?? 'pick';
  return {
    game: gameById(raw.game)?.id ?? d.game,
    s,
    g,
    topic: topics.some((t) => t.id === raw.topic) ? String(raw.topic) : '',
    custom: cleanText(raw.custom, 60),
    lv: LEVELS.some((l) => l.id === raw.lv) ? (raw.lv as GameRecipe['lv']) : d.lv,
    lang: LANGS.some((l) => l.id === raw.lang) ? (raw.lang as GameRecipe['lang']) : d.lang,
    count: COUNT_OPTIONS.includes(Number(raw.count)) ? Number(raw.count) : d.count,
    // ชุดคำถามแบบเลือกตอบใช้กับเกมจัดกลุ่ม/เรียงลำดับไม่ได้
    source: act === 'pick' && (raw.source === 'bank' || raw.source === 'mine') ? raw.source : 'auto',
    pace: pick(PACES, raw.pace, d.pace),
    timer: pick(TIMERS, Number(raw.timer), d.timer),
    lives: pick(LIVES, raw.lives, d.lives) as GameRecipe['lives'],
    teams: pick(TEAMS, Number(raw.teams), d.teams),
    aim: gameById(raw.game)?.aim ? pick(AIMS, Number(raw.aim), d.aim) : 0,
    gfx: pick(GFXS, Number(raw.gfx), d.gfx),
    mood: pick(MOODS, Number(raw.mood), d.mood),
  };
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu;
export const stripEmoji = (s: string) => s.replace(EMOJI, '').replace(/[ \t]+/g, ' ').trim();
export const hasEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);

const plain = (r: Parameters<typeof richToPlain>[0]) => stripEmoji(richToPlain(r, 600));

/** แปลงชุดคำถามของเว็บเป็นข้อแบบเรียบ ข้อที่ไม่มีข้อความ (รูปอย่างเดียว) หรือพิมพ์ตอบถูกข้ามและนับไว้ */
export function quizToItems(c: QuizContent): { items: GItem[]; skipped: number } {
  const items: GItem[] = [];
  let skipped = 0;
  for (const q of c.questions) {
    const text = plain(q.text);
    if (!text || q.kind === 'text') {
      skipped++;
      continue;
    }
    const choices = q.choices.map((ch) => plain(ch.text));
    // ตัวเลือกที่เป็นรูปอย่างเดียว ส่งเป็นข้อความไม่ได้ ข้ามทั้งข้อ
    if (choices.length < 2 || choices.some((x) => !x)) {
      skipped++;
      continue;
    }
    const correct = q.choices.flatMap((ch, i) => (ch.correct ? [i] : []));
    if (!correct.length) {
      skipped++;
      continue;
    }
    items.push({ q: text, choices, correct, media: !!q.media || undefined });
  }
  return { items, skipped };
}

export const topicLabel = (r: GameRecipe) => {
  const t = subjectOf(r.s).topics.find((x) => x.id === r.topic);
  return r.custom || t?.th || 'เรื่องทั่วไปของวิชานี้';
};

/** ข้อความบนจอเกม */
const UI_WORDS: Record<string, [string, string]> = {
  start: ['เริ่มเล่น', 'Start'],
  ready: ['พร้อมแล้ว!', 'Ready!'],
  pause: ['หยุดพัก', 'Pause'],
  resume: ['เล่นต่อ', 'Resume'],
  restart: ['เริ่มใหม่', 'Restart'],
  sound: ['เสียง', 'Sound'],
  full: ['เต็มจอ', 'Full screen'],
  speed: ['ความเร็ว', 'Speed'],
  correct: ['ถูกต้อง! เก่งมาก', 'Correct! Great job!'],
  wrong: ['เกือบแล้ว ลองอีกครั้งนะ', 'So close, try again!'],
  reveal: ['คำตอบคือ', 'The answer is'],
  again: ['เล่นอีกครั้ง', 'Play again'],
  team1: ['ทีม A', 'Team A'],
  team2: ['ทีม B', 'Team B'],
  turn: ['ตาของ X', 'X, your turn'],
  win: ['X ชนะ!', 'X wins!'],
  draw: ['เสมอกัน! เก่งทั้งสองทีม', 'A draw! Both teams did great'],
  miss: ['พลาดเป้า ลองเล็งใหม่นะ', 'Missed! Aim again'],
  aimHint: ['ลากเพื่อเล็ง แล้วปล่อย', 'Drag to aim, then let go'],
  holdHint: ['แตะให้ตรงจังหวะ', 'Tap at the right moment'],
  chargeHint: ['กดค้างที่ใบบัว ยิ่งค้างยิ่งกระโดดไกล', 'Hold on a lily pad to charge the jump'],
  castHint: ['ลากเล็งไปที่ปลาตัวที่ถูก แล้วปล่อยเหวี่ยงเบ็ด', 'Drag toward the right fish and let go to cast'],
  reelHint: ['ปลากินเบ็ด! กดค้างดึง ปล่อยเมื่อสายตึงแดง', 'Fish on! Hold to reel, let go when the line turns red'],
  snap: ['สายขาด! ค่อยๆ ดึงนะ', 'The line snapped! Reel gently'],
  flyHint: ['กดค้างเพื่อบินขึ้น ปล่อยเพื่อร่อนลง', 'Hold to climb, let go to glide down'],
  steerHint: ['แตะค้างนำทางหนอน กินตามลำดับ', 'Hold to guide the worm and eat in order'],
  tiltHint: ['ลากเพื่อเอียงโต๊ะ พาลูกแก้วลงหลุมที่ถูก', 'Drag to tilt the table into the right hole'],
  driveHint: ['ขับไปจอดหน้าบ้าน แล้วกดลูกศรขึ้น', 'Drive to the house, then press Up'],
  no3d: ['เครื่องนี้แสดงภาพ 3 มิติไม่ได้ ลองเปิดด้วย Chrome หรือเครื่องอื่นนะ', 'This device cannot show 3D. Please try Chrome or another device.'],
};

export function wordsBlock(lang: GameRecipe['lang']): string {
  const pick = ([th, en]: [string, string]) => (lang === 'en' ? en : lang === 'th' ? th : th + ' / ' + en);
  return ['const WORDS = {', ...Object.entries(UI_WORDS).map(([k, v]) => '  ' + k + ': ' + JSON.stringify(pick(v)) + ','), '};'].join('\n');
}
