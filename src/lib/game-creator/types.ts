/**
 * ระบบสร้างเกมจาก Template: ชนิดข้อมูลกลาง
 * เนื้อหาเกมเก็บเป็น jsonb ในตาราง user_games.content (ตรวจ/ทำความสะอาดด้วย sanitizeQuiz ก่อนใช้ทุกครั้ง)
 */

/** ข้อความผสมสูตรคณิต: ส่วนข้อความธรรมดา (x) กับส่วนสูตร LaTeX (m) */
export type Seg = { t: 'x'; v: string } | { t: 'm'; v: string };
export type Rich = Seg[];

export interface MediaRef {
  kind: 'image' | 'video';
  /** URL สาธารณะใน Supabase Storage (bucket game-media) เท่านั้น */
  url: string;
  /** พาธในบักเก็ต (ใช้ลบไฟล์) */
  path: string;
  w?: number;
  h?: number;
  /** วิดีโอ: ช่วงเวลาที่เล่น (วินาที) ยาวได้ไม่เกิน VIDEO_MAX_SECONDS */
  start?: number;
  end?: number;
}

export interface QuizChoice {
  id: string;
  text: Rich;
  media: MediaRef | null;
  correct: boolean;
}

export type PointsMode = 0 | 1 | 2; // ไม่คิดคะแนน / ปกติ / สองเท่า

export interface QuizQuestion {
  id: string;
  text: Rich;
  media: MediaRef | null;
  choices: QuizChoice[];
  /** ตอบได้หลายข้อ (ต้องเลือกครบทุกข้อที่ถูก) */
  multi: boolean;
  /** เวลาต่อข้อ (วินาที) 0 = ไม่จำกัด */
  time: number;
  points: PointsMode;
}

export interface QuizContent {
  v: 1;
  questions: QuizQuestion[];
}

export type TemplateId = 'quiz';

/** แถวในตาราง user_games */
export interface UserGame {
  id: string;
  owner_id: string;
  title: string;
  template: TemplateId;
  content: QuizContent;
  question_count: number;
  play_count: number;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export type UserGameSummary = Omit<UserGame, 'content'>;

/* ---------------------------- ห้องเล่นสด ---------------------------- */

export type RoomMode = 'watch' | 'play';
export type RoomStatus = 'lobby' | 'playing' | 'ended' | 'closed';

export type RoomBackground =
  | { kind: 'preset'; id: string }
  | { kind: 'color'; value: string }
  | { kind: 'image'; url: string };

export interface RoomSettings {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
}

/** คำถามที่ส่งให้ผู้เล่น (ไม่มีเฉลย) */
export interface PublicQuestion {
  id: string;
  index: number; // ลำดับที่ผู้เล่นเห็น (เริ่ม 0)
  total: number;
  text: Rich;
  media: MediaRef | null;
  choices: { id: string; text: Rich; media: MediaRef | null }[];
  multi: boolean;
  time: number;
  points: PointsMode;
  /** เวลาที่ผ่านไปแล้วของข้อนี้ (มิลลิวินาที) นับจากฝั่งเซิร์ฟเวอร์ กันรีเฟรชเพื่อรีเซ็ตเวลา */
  elapsedMs: number;
}

export interface AnswerResult {
  correct: boolean;
  timeout: boolean;
  points: number;
  correctIds: string[];
  score: number;
  streak: number;
}

export interface PlayerPublic {
  id: string;
  nickname: string;
  avatar: number;
  isHost: boolean;
  score: number;
  correct: number;
  answered: number;
  streak: number;
  finished: boolean;
  lastCorrect: boolean | null;
}
