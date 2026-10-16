import type { QuizEngine } from '../quiz/QuizRunner';

/** สิ่งที่ตัวเกม (Café / Tower / Racing) ได้รับจากห้องเล่น */
export interface GameProps {
  engine: QuizEngine;
  /** เวลาจบเกม (ms ตามนาฬิกาเครื่องนี้) null = ไม่จับเวลา */
  deadline: number | null;
  /** Racing: จำนวนก้าวถึงเส้นชัย */
  goal: number;
  /** ส่งคะแนนจากเกมให้เซิร์ฟเวอร์ (Café / Tower) */
  sync?: (score: number, stats: Record<string, number>) => void;
  me: { nickname: string; avatar: number };
  /** ทดลองเล่นในหน้าแก้ไข (ไม่มีห้อง) */
  preview?: boolean;
}
