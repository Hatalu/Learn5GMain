/**
 * รูปแบบการเล่น: ชุดคำถามชุดเดียว เล่นได้หลายรูปแบบ
 * ตอนเปิดห้อง ระบบเช็กว่าชุดคำถามเข้ากับรูปแบบนั้นไหม (modeFit) แล้วปรับชุดคำถามให้ (modeQuiz)
 * เพิ่มรูปแบบใหม่: ใส่ที่ MODES + เพิ่มค่าใน check constraint ของ game_rooms.game (migration) + ทำตัวเกม
 */
import type { QuizContent } from './types';
import { playableQuiz } from './quiz';

export type GameMode = 'quiz' | 'cafe' | 'tower' | 'racing' | 'brawl' | 'fishing';

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
  scoreLabel: string;
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
];

export const modeById = (id: unknown): ModeInfo => MODES.find((m) => m.id === id) || MODES[0];
export const isGameMode = (id: unknown): id is GameMode => MODES.some((m) => m.id === id);

/** ชุดคำถามที่ใช้เล่นในโหมดนี้ (ตัดข้อไม่ครบ + ข้อที่มีคลิปถ้าโหมดไม่รองรับ) */
export function modeQuiz(content: QuizContent, mode: GameMode): QuizContent {
  const m = modeById(mode);
  const base = playableQuiz(content);
  if (!m.noVideo) return base;
  return {
    v: 1,
    questions: base.questions.filter((q) => q.media?.kind !== 'video' && !q.choices.some((c) => c.media?.kind === 'video')),
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
  const all = playableQuiz(content).questions.length;
  const usable = modeQuiz(content, mode).questions.length;
  const skippedVideo = all - usable;
  const rules: ModeFit['rules'] = [{ text: `ต้องมีคำถามอย่างน้อย ${m.minQuestions} ข้อ (ใช้ได้ ${usable} ข้อ)`, pass: usable >= m.minQuestions }];
  if (m.noVideo) rules.push({ text: skippedVideo ? `ไม่รองรับคลิป ข้อที่มีคลิป ${skippedVideo} ข้อจะถูกข้าม` : 'ไม่รองรับคลิปวิดีโอ', pass: true });
  if (m.endless) rules.push({ text: 'คำถามจะวนซ้ำจนหมดเวลา/ถึงเส้นชัย', pass: true });
  return { ok: usable >= m.minQuestions, usable, skippedVideo, rules };
}

export function cleanModeSettings(mode: GameMode, input: unknown): { duration: number; goal: number } {
  const m = modeById(mode);
  const s = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const duration = m.durations?.includes(s.duration as number) ? (s.duration as number) : m.defaultDuration || 0;
  const goal = m.goals?.includes(s.goal as number) ? (s.goal as number) : m.defaultGoal || 0;
  return { duration, goal };
}

/* ------------------------------ เพดานคะแนน (กันโกงฝั่งเบราว์เซอร์) ------------------------------ */

/** คะแนนสูงสุดที่เป็นไปได้จากจำนวนข้อที่ตอบถูก (โหมดที่เกมคำนวณในเครื่องผู้เล่น) */
export function scoreCap(mode: GameMode, correct: number): number {
  if (mode === 'cafe') return correct * 260 + 400;
  if (mode === 'tower') return correct * 450 + 1500;
  if (mode === 'brawl') return correct * 700 + 3000;
  // ปลาหนักสุด ~40,000 ปอนด์ x แม่เหล็ก 2 เท่า ต่อเหยื่อ 1 ชิ้น (เหยื่อแถมจากหีบสมบัติเผื่อไว้)
  if (mode === 'fishing') return correct * 90000 + 2000;
  return Number.MAX_SAFE_INTEGER;
}

export function fmtDuration(sec: number): string {
  return sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} นาที` : `${sec / 60} นาที`;
}
