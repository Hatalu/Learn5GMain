/**
 * รายการ Template ของระบบสร้างเกม
 * เพิ่ม Template ใหม่: ใส่ข้อมูลที่นี่ (available: true) + สร้างตัวแก้ไข/ตัวเล่นของ Template นั้น
 */
import type { TemplateId } from './types';

export interface TemplateInfo {
  id: TemplateId | string;
  name: string;
  tagline: string;
  points: string[];
  /** สีหลักของการ์ด */
  color: string;
  soft: string;
  available: boolean;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'quiz',
    name: 'ควิซตอบไว',
    tagline: 'แข่งตอบคำถามทั้งห้อง',
    points: ['ใส่สูตรคณิต เศษส่วนสวย', 'แนบรูป และคลิป 5 วินาที', 'จับเวลา คิดคะแนนเร็ว'],
    color: '#9b6cf0',
    soft: '#efe6ff',
    available: true,
  },
  {
    id: 'match',
    name: 'จับคู่ให้ตรง',
    tagline: 'ลากคู่ที่ใช่มาชนกัน',
    points: ['คำ กับ ความหมาย', 'รูป กับ คำตอบ'],
    color: '#3fd6a8',
    soft: '#dcfaef',
    available: false,
  },
  {
    id: 'sort',
    name: 'เรียงลำดับ',
    tagline: 'เรียงให้ถูกก่อนใคร',
    points: ['ขั้นตอน ลำดับเหตุการณ์', 'มาก-น้อย'],
    color: '#ff9a3d',
    soft: '#ffecd9',
    available: false,
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

/* ------------------------------ ชื่อเล่นผู้เล่น ------------------------------ */

export const NICK_MAX = 16;

export function cleanNickname(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX);
}

export const AVATAR_COUNT = 12;

/* ------------------------------ เลขห้อง ------------------------------ */

export const isRoomCode = (s: unknown): s is string => typeof s === 'string' && /^[0-9]{6}$/.test(s);
