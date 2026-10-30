import type { Gear } from '@/lib/game-creator/gear';
import type { QuizEngine } from '../quiz/QuizRunner';
import type { WorldInfo } from './worldKit';

/** สิ่งที่ตัวเกม (Café / Tower / Racing) ได้รับจากห้องเล่น */
export interface GameProps {
  engine: QuizEngine;
  /** เวลาจบเกม (ms ตามนาฬิกาเครื่องนี้) null = ไม่จับเวลา */
  deadline: number | null;
  /** Racing: จำนวนก้าวถึงเส้นชัย */
  goal: number;
  /** ส่งคะแนนจากเกมให้เซิร์ฟเวอร์ (Café / Tower) */
  sync?: (score: number, stats: Record<string, number>) => void;
  me: { nickname: string; avatar: number; gear?: Gear };
  /** ทดลองเล่นในหน้าแก้ไข (ไม่มีห้อง) */
  preview?: boolean;
  /** ออกจากห้อง (แสดงปุ่มตอนเกมจบ) */
  onLeave?: () => void;
  /** โหมดโลกเดียวกัน (ศึกยึดอาณาจักร / เกาะมหาสมบัติ): ข้อมูลห้องสำหรับเห็นกันสดๆ */
  world?: WorldInfo;
  /** ขโมยไข่: ไข่เกิดใหม่ทุกกี่วินาที + เวลาเริ่มเกม (ms นาฬิกาเซิร์ฟเวอร์) */
  reset?: number;
  startedAt?: number;
  /** คะแนนที่มีอยู่แล้ว (รีเฟรชกลางเกม) */
  startScore?: number;
}
