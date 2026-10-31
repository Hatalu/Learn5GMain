/**
 * รูปแบบการเล่น: ชุดคำถามชุดเดียว เล่นได้หลายรูปแบบ
 * ตอนเปิดห้อง ระบบเช็กว่าชุดคำถามเข้ากับรูปแบบนั้นไหม (modeFit) แล้วปรับชุดคำถามให้ (modeQuiz)
 * เพิ่มรูปแบบใหม่: ใส่ที่ MODES + เพิ่มค่าใน check constraint ของ game_rooms.game (migration) + ทำตัวเกม
 */
import type { QuizContent } from './types';
import { playableQuiz } from './quiz';
import { EGG_MAX_VALUE } from './eggValues';

export type GameMode = 'quiz' | 'cafe' | 'tower' | 'racing' | 'brawl' | 'fishing' | 'turf' | 'treasure' | 'egg' | 'ar';

/** โหมดโลกเดียวกัน: ทุกคนเดินในแผนที่เดียว เห็นกันสดๆ (ส่งตำแหน่งผ่าน Realtime) */
export const isWorldMode = (g: GameMode) => g === 'turf' || g === 'treasure' || g === 'egg';

/** วิธีเล่น: room = ผู้เล่นเข้าห้องด้วยมือถือของตัวเอง / local = เล่นในเครื่องนี้เครื่องเดียว (เดี่ยวหรือทีม) */
export type PlayType = 'room' | 'local';
export const PLAY_TYPES: { id: PlayType; name: string; desc: string; color: string }[] = [
  { id: 'room', name: 'เข้าร่วมห้อง', desc: 'ผู้เล่นแต่ละคนใช้มือถือ/แท็บเล็ตของตัวเอง', color: '#4a7bf0' },
  { id: 'local', name: 'เล่นในเครื่องเดียว', desc: 'เล่นในเครื่องนี้เครื่องเดียว จะเดี่ยวหรือทีมก็ได้', color: '#ff9a3d' },
];

export interface ModeInfo {
  id: GameMode;
  name: string;
  genre: string;
  tagline: string;
  steps: string[];
  color: string;
  dark: string;
  soft: string;
  /** จำนวนคำถามขั้นต่ำ (นับหลังตัดข้อที่ใช้ไม่ได้) */
  minQuestions: number;
  /** ข้อที่มีคลิปใช้ไม่ได้ในโหมดนี้ (จะถูกข้าม) */
  noVideo: boolean;
  /** คำถามวนซ้ำได้ไม่จำกัด (เล่นตามเวลา/เส้นชัย) */
  endless: boolean;
  durations?: number[]; // วินาที
  goals?: number[]; // จำนวนก้าวถึงเส้นชัย (Racing)
  defaultDuration?: number;
  defaultGoal?: number;
  /** แบ่งทีมได้ (0 = ต่างคนต่างเล่น) */
  teams?: number[];
  /** ไข่ทุกไบโอมเกิดใหม่ทุกกี่วินาที (ขโมยไข่) */
  resets?: number[];
  defaultReset?: number;
  scoreLabel: string;
  /** วิธีเล่น (ไม่ใส่ = room) */
  playType?: PlayType;
  /** ตอบได้แค่แบบชี้เลือก 1 ตัวเลือก (ข้อพิมพ์คำตอบ/หลายคำตอบถูกข้าม) */
  choiceOnly?: boolean;
}

export const MODES: ModeInfo[] = [
  {
    id: 'quiz',
    name: 'ควิซตอบไว',
    genre: 'แข่งตอบคำถาม',
    tagline: 'ตอบถูกและไว ได้คะแนนมาก',
    steps: ['ตอบทีละข้อจนครบชุด', 'ยิ่งตอบไวยิ่งได้คะแนนเยอะ', 'ถูกติดกันได้โบนัส'],
    color: '#9b6cf0',
    dark: '#6a3cc4',
    soft: '#efe6ff',
    minQuestions: 1,
    noVideo: false,
    endless: false,
    scoreLabel: 'คะแนน',
  },
  {
    id: 'cafe',
    name: 'Café ร้านหนูน้อย',
    genre: 'บริหารร้าน (Tycoon)',
    tagline: 'ตอบถูก = ได้วัตถุดิบ เสิร์ฟลูกค้า รับเงิน อัปเกรดร้าน',
    steps: ['ลูกค้าเดินเข้ามาสั่งอาหาร', 'เปิดแผงคำถาม ตอบถูกได้วัตถุดิบทันที ตอบกี่ข้อก็ได้', 'แตะลูกค้าเพื่อเสิร์ฟ รับเงิน', 'ซื้ออัปเกรด ทำได้ไวขึ้น ขายแพงขึ้น'],
    color: '#ff9a3d',
    dark: '#c76512',
    soft: '#ffecd9',
    minQuestions: 3,
    noVideo: true,
    endless: true,
    durations: [180, 300, 420, 600],
    defaultDuration: 300,
    scoreLabel: 'รายได้',
  },
  {
    id: 'tower',
    name: 'ป้อมปราการสไลม์',
    genre: 'วางแผนป้องกันฐาน (Tower Defense)',
    tagline: 'ตอบถูก = ได้เหรียญ สุ่มตัวละคร ลากวางกันสไลม์บุกฐาน',
    steps: ['ตอบคำถามรับเหรียญ ตอบกี่ข้อก็ได้', 'สุ่มตัวละคร 12 แบบ ลากจากกระเป๋าไปวางข้างทาง', 'เวฟมาเองทุกรอบ พักแค่ 3 วินาที', 'ลากตัวเดียวกันมาทับ รวมร่างแรงขึ้น'],
    color: '#3fd6a8',
    dark: '#169a72',
    soft: '#dcfaef',
    minQuestions: 5,
    noVideo: true,
    endless: true,
    durations: [300, 420, 600, 900],
    defaultDuration: 420,
    scoreLabel: 'คะแนนป้อม',
  },
  {
    id: 'racing',
    name: 'วิ่งแข่งสายฟ้า',
    genre: 'แข่งความเร็ว (Speed Runner)',
    tagline: 'ตอบถูก 1 ข้อ ก้าวไป 1 ก้าว ใครถึงเส้นชัยก่อนชนะ',
    steps: ['ตอบให้ไวที่สุด ถูก = ก้าวไปข้างหน้า', 'ตอบผิดจะสะดุดหยุดแป๊บนึง', 'ถูกติดกัน 3 ข้อ ได้ไอเท็ม บูสต์ หรือ กล้วย', 'ถึงเส้นชัยก่อนชนะ'],
    color: '#4a7bf0',
    dark: '#2a4fb8',
    soft: '#e2ebff',
    minQuestions: 5,
    noVideo: true,
    endless: true,
    goals: [10, 15, 20, 30],
    defaultGoal: 15,
    scoreLabel: 'ก้าว',
  },
  {
    id: 'brawl',
    name: 'Monster Brawl',
    genre: 'แอ็กชันเอาชีวิตรอด (Arcade Survival)',
    tagline: 'ตอบถูก = เลเวลอัป ปลดล็อกอาวุธเท่ๆ ถล่มฝูงมอนสเตอร์',
    steps: ['ใช้ปุ่มลูกศร หรือลากนิ้วบนจอ เดินหลบมอนสเตอร์', 'ตอบถูก = เลเวลอัป เลือกอาวุธใหม่ หรืออัปอาวุธเดิม', 'ยิ่งนานมอนสเตอร์ยิ่งเยอะ บอสโผล่ทุก 90 วินาที', 'หมดแรงไม่แพ้ ฟื้นแล้วลุยต่อได้'],
    color: '#ff6b7a',
    dark: '#c9354a',
    soft: '#ffe1e5',
    minQuestions: 5,
    noVideo: true,
    endless: true,
    durations: [180, 300, 420, 600],
    defaultDuration: 300,
    scoreLabel: 'คะแนนศึก',
  },
  {
    id: 'fishing',
    name: 'Fishing Frenzy',
    genre: 'ปาร์ตี้เกมแคชชวล (Casual Arcade)',
    tagline: 'ตอบถูก = ได้เหยื่อ ถูกติดกันเบ็ดยิ่งลึก เจอปลาหายากตัวยักษ์',
    steps: ['ตอบถูก 1 ข้อ ได้เหยื่อ 1 ชิ้น', 'กดเหวี่ยงเบ็ด ปลากินเบ็ดแล้วกดดึงรัวๆ', 'ถูกติดกัน ตัวคูณความลึกสูงขึ้น เจอปลาตัวหนักกว่า', 'อาจได้ไอเท็ม แม่เหล็กดูดแต้ม หรือเหยื่อปลายักษ์'],
    color: '#29b6d8',
    dark: '#13809e',
    soft: '#dcf5fc',
    minQuestions: 3,
    noVideo: true,
    endless: true,
    durations: [180, 300, 420, 600],
    defaultDuration: 300,
    scoreLabel: 'น้ำหนักปลา (ปอนด์)',
  },
  {
    id: 'turf',
    name: 'ศึกยึดอาณาจักร',
    genre: 'ระบายสียึดพื้นที่ (Turf Wars)',
    tagline: 'เดินระบายสียึดแผนที่ หมึกหมดวิ่งเข้าป้อม ตอบถูกเติมหมึกพร้อมไอเท็ม',
    steps: ['ทุกคนอยู่ในแผนที่เดียวกัน เดินไปตรงไหนพื้นเป็นสีของเรา', 'เดินระบายใช้หมึก หมึกหมดวิ่งเข้าป้อมเติมหมึก (ในป้อมไม่มีใครโจมตีได้)', 'ในป้อมตอบคำถาม ถูก = หมึกเต็มถัง + ไอเท็ม รองเท้าสปีด ระเบิดสี โล่ล็อกสี', 'หมดเวลา ใครยึดพื้นที่ได้มากสุดชนะ'],
    color: '#ff4fa3',
    dark: '#c21f72',
    soft: '#ffe0f0',
    minQuestions: 3,
    noVideo: false,
    endless: true,
    durations: [180, 300, 420, 600],
    defaultDuration: 300,
    teams: [0, 2, 3, 4],
    scoreLabel: 'ช่องที่ยึดได้',
  },
  {
    id: 'treasure',
    name: 'เกาะมหาสมบัติโจรสลัด',
    genre: 'สำรวจล่าสมบัติ (Treasure Hunt)',
    tagline: 'วิ่งหาหีบสมบัติบนเกาะ ถอดรหัสให้ถูก ได้เพชรและอาวุธโจรสลัด',
    steps: ['เดินสำรวจเกาะ เห็นเพื่อนวิ่งแข่งหาหีบสมบัติ', 'ถึงหีบแล้วกดสำรวจ ตอบคำถามเพื่อถอดรหัส', 'ถูก = เพชรเพียบ + อาวุธ ปืนใหญ่น้ำแข็ง ตะขอดึงตัว หรือซื้อสัตว์เลี้ยงช่วยเก็บเพชร', 'ผิด = หีบระเบิดมึนงง เพื่อนข้างๆ แย่งตอบต่อได้ทันที!'],
    color: '#e0a21b',
    dark: '#9c6b00',
    soft: '#fff2cc',
    minQuestions: 3,
    noVideo: false,
    endless: true,
    durations: [180, 300, 420, 600],
    defaultDuration: 300,
    scoreLabel: 'เพชร',
  },
  {
    id: 'egg',
    name: 'ขโมยไข่บอสหลับ',
    genre: 'ผจญภัย 3 มิติ (Steal & Run)',
    tagline: 'ฐาน > 5 ไบโอม ยิ่งไกลไข่ยิ่งหนัก บอสยิ่งเร็ว พาไข่กลับฐานฟักเป็นสัตว์!',
    steps: ['วิ่งจากฐานขึ้นไปทีละไบโอม ไบโอมละ 5 ฟอง ยิ่งไกลยิ่งหนัก', 'ถึงไข่แล้วกดขโมย ตอบให้ถูก ใครถูกก่อนได้ไข่ไป', 'บอสตื่น! วิ่งกลับฐานฟักไข่เป็นสัตว์ โดนจับไข่กลับที่เดิม', 'ไข่เกิดใหม่เป็นรอบ เก็บสัตว์ในกระเป๋า อัปความเร็ววิ่ง'],
    color: '#7c5cff',
    dark: '#4a2fc0',
    soft: '#ece6ff',
    minQuestions: 3,
    noVideo: false,
    endless: true,
    durations: [180, 300, 420, 600],
    defaultDuration: 300,
    teams: [0, 2, 3, 4],
    resets: [60, 120, 180, 300],
    defaultReset: 120,
    scoreLabel: 'น้ำหนักสัตว์ (kg)',
  },
  {
    id: 'ar',
    name: 'สงครามอวกาศ AR',
    genre: 'ขยับร่างกายผ่านกล้อง (AR)',
    tagline: 'ยกมือเล็งยานเอเลียนที่ถือคำตอบถูก ค้างไว้จนล็อกเป้า แล้วยิงเลเซอร์!',
    steps: ['ยืนให้กล้องเห็นตั้งแต่หัวถึงเอว ระบบจับโครงร่างให้ดู', 'ยกมือเล็งยานที่ถือคำตอบถูก ค้างไว้จนวงล็อกเต็ม', 'ตอบถูก = ยิงเลเซอร์ ได้คะแนน แล้วรอบโบนัสยิงอุกกาบาต', 'มีบอส 3D ไอเทม คอมโบ แผนที่จักรวาล อัปเกรดยาน และเล่นเป็นทีม 2-4 ทีมได้'],
    color: '#2fb8ff',
    dark: '#1a5fd0',
    soft: '#dff3ff',
    minQuestions: 3,
    noVideo: true,
    endless: false,
    teams: [0, 2, 3, 4],
    scoreLabel: 'คะแนน',
    playType: 'local',
    choiceOnly: true,
  },
];

export const playTypeOf = (m: ModeInfo): PlayType => m.playType || 'room';

export const modeById = (id: unknown): ModeInfo => MODES.find((m) => m.id === id) || MODES[0];
export const isGameMode = (id: unknown): id is GameMode => MODES.some((m) => m.id === id);

/** ชุดคำถามที่ใช้เล่นในโหมดนี้ (ตัดข้อไม่ครบ + ข้อที่มีคลิปถ้าโหมดไม่รองรับ) */
export function modeQuiz(content: QuizContent, mode: GameMode): QuizContent {
  const m = modeById(mode);
  const base = playableQuiz(content);
  if (!m.noVideo && !m.choiceOnly) return base;
  return {
    v: 1,
    questions: base.questions.filter(
      (q) => (!m.noVideo || (q.media?.kind !== 'video' && !q.choices.some((c) => c.media?.kind === 'video'))) && (!m.choiceOnly || (q.kind !== 'text' && !q.multi))
    ),
  };
}

export interface ModeFit {
  ok: boolean;
  usable: number;
  skippedVideo: number;
  /** ข้อความสั้นๆ อธิบายข้อจำกัด (ผ่าน/ไม่ผ่าน แสดงด้วยไอคอนในหน้าเว็บ) */
  rules: { text: string; pass: boolean }[];
}

export function modeFit(content: QuizContent, mode: GameMode): ModeFit {
  const m = modeById(mode);
  const playable = playableQuiz(content).questions;
  const all = playable.length;
  const usable = modeQuiz(content, mode).questions.length;
  const notChoice = m.choiceOnly ? playable.filter((q) => q.kind === 'text' || q.multi).length : 0;
  const skippedVideo = all - usable - notChoice;
  const rules: ModeFit['rules'] = [{ text: `ต้องมีคำถามอย่างน้อย ${m.minQuestions} ข้อ (ใช้ได้ ${usable} ข้อ)`, pass: usable >= m.minQuestions }];
  if (m.noVideo) rules.push({ text: skippedVideo > 0 ? `ไม่รองรับคลิป ข้อที่มีคลิป ${skippedVideo} ข้อจะถูกข้าม` : 'ไม่รองรับคลิปวิดีโอ', pass: true });
  if (m.choiceOnly) rules.push({ text: notChoice ? `ใช้เฉพาะข้อเลือกตอบ 1 คำตอบ ข้อพิมพ์/หลายคำตอบ ${notChoice} ข้อจะถูกข้าม` : 'ใช้เฉพาะข้อเลือกตอบ 1 คำตอบ', pass: true });
  if (m.playType === 'local') rules.push({ text: 'ใช้กล้องของเครื่องนี้ (ไม่มีกล้อง = แตะจอแทน)', pass: true });
  if (m.endless) rules.push({ text: 'คำถามจะวนซ้ำจนหมดเวลา/ถึงเส้นชัย', pass: true });
  return { ok: usable >= m.minQuestions, usable, skippedVideo, rules };
}

export function cleanModeSettings(mode: GameMode, input: unknown): { duration: number; goal: number; teams: number; reset: number } {
  const m = modeById(mode);
  const s = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const duration = m.durations?.includes(s.duration as number) ? (s.duration as number) : m.defaultDuration || 0;
  const goal = m.goals?.includes(s.goal as number) ? (s.goal as number) : m.defaultGoal || 0;
  const teams = m.teams?.includes(s.teams as number) ? (s.teams as number) : 0;
  const reset = m.resets?.includes(s.reset as number) ? (s.reset as number) : m.defaultReset || 0;
  return { duration, goal, teams, reset };
}

/* ------------------------------ เพดานคะแนน (กันโกงฝั่งเบราว์เซอร์) ------------------------------ */

/** คะแนนสูงสุดที่เป็นไปได้จากจำนวนข้อที่ตอบถูก (โหมดที่เกมคำนวณในเครื่องผู้เล่น) */
export function scoreCap(mode: GameMode, correct: number): number {
  if (mode === 'cafe') return correct * 260 + 400;
  if (mode === 'tower') return correct * 450 + 1500;
  if (mode === 'brawl') return correct * 700 + 3000;
  // ปลาหนักสุด ~40,000 ปอนด์ x แม่เหล็ก 2 เท่า ต่อเหยื่อ 1 ชิ้น (เหยื่อแถมจากหีบสมบัติเผื่อไว้)
  if (mode === 'fishing') return correct * 90000 + 2000;
  // ถังหมึก 100 ช่อง/ข้อถูก + ระเบิดสี ~50 ช่อง + หมึกเริ่มต้น (ช่องที่ยึดได้นับได้ไม่เกินแผนที่อยู่แล้ว)
  if (mode === 'turf') return Math.min(TURF_CELLS, correct * 160 + 120);
  // หีบ 1 ใบ/ข้อถูก สูงสุด 60 เพชร + เพชรที่เดินเก็บตามพื้นเกาะ
  if (mode === 'treasure') return correct * 90 + 600;
  // ไข่ 1 ฟอง/ข้อถูก สูงสุดคือไข่ความลับ
  if (mode === 'egg') return correct * EGG_MAX_VALUE + 50;
  return Number.MAX_SAFE_INTEGER;
}

/** จำนวนช่องในแผนที่ศึกยึดอาณาจักร (ต้องตรงกับตัวเกม) */
export const TURF_W = 46;
export const TURF_H = 30;
export const TURF_CELLS = TURF_W * TURF_H;

export function fmtDuration(sec: number): string {
  return sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} นาที` : `${sec / 60} นาที`;
}
