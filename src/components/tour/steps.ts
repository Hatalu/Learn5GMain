import { MODES } from '@/lib/game-creator/modes';

/**
 * ทัวร์แนะนำเว็บหลังสมัครบัญชี: หน้าหลัก > คลังเกม > ระบบสร้างเกม (ภาพรวมรูปแบบเกม) > ระบบสร้างสื่อ > สมัครสมาชิก
 * target / click / via คือค่า data-tour="..." ของ element ในหน้านั้น ๆ
 */
export type TourChapter = 'start' | 'home' | 'library' | 'create' | 'member';

export interface TourStep {
  id: string;
  /** หน้าที่ต้องอยู่ (ไม่ตรงจะพาไปเอง) */
  path: string;
  chapter: TourChapter;
  title: string;
  text: string;
  /** เวลาที่โชว์ก่อนไปขั้นถัดไปเอง (มิลลิวินาที) */
  ms: number;
  /** element ที่ส่องไฟ ไม่ใส่ = การ์ดกลางจอ */
  target?: string;
  /** element ที่เคอร์เซอร์จะกดให้ก่อนโชว์ (ข้ามถ้าเลือกอยู่แล้ว aria-selected=true) */
  click?: string;
  /** ปุ่มบนแถบเมนูที่เคอร์เซอร์ชี้ก่อนเปลี่ยนหน้า (เฉพาะตอนเดินหน้า) */
  via?: string;
  /** สีประจำขั้น (กรอบไฟส่อง/ป้าย) */
  accent: string;
  /** ป้ายเล็กเหนือหัวข้อ */
  chip?: string;
  final?: boolean;
}

export const CHAPTERS: Record<TourChapter, { label: string; color: string }> = {
  start: { label: 'เริ่มต้น', color: '#8660fb' },
  home: { label: 'หน้าหลัก', color: '#4a7bf0' },
  library: { label: 'คลังสื่อ', color: '#7c4dff' },
  create: { label: 'สร้างเกมและสื่อ', color: '#14b8a6' },
  member: { label: 'สมาชิก', color: '#f5a524' },
};

export const STEPS: TourStep[] = [
  {
    id: 'welcome',
    path: '/home',
    chapter: 'start',
    title: 'ยินดีต้อนรับสู่สื่อการสอน 5G',
    text: 'น้องไฟว์จีจะพาเที่ยวรอบเว็บ ใช้เวลาราว 1 นาที',
    ms: 5200,
    accent: '#8660fb',
  },
  {
    id: 'hero',
    path: '/home',
    chapter: 'home',
    target: 'hero',
    title: 'หน้าหลัก',
    text: 'น้องไฟว์จีต้อนรับ เกมในคลังเลื่อนผ่านด้านล่าง แตะเพื่อเปิดดู',
    ms: 5000,
    accent: '#4a7bf0',
  },
  {
    id: 'library',
    path: '/home',
    chapter: 'library',
    target: 'library-head',
    title: 'คลังสื่อการสอน ป.1 - ป.6',
    text: 'เกมการเรียนรู้ทุกวิชา กรองตามวิชาและชั้นได้',
    ms: 5200,
    accent: '#7c4dff',
  },
  {
    id: 'games',
    path: '/home',
    chapter: 'library',
    target: 'library',
    title: 'เกมการเรียนรู้',
    text: 'กดเกมที่ชอบแล้วเล่นได้เลย กรองตามวิชาและชั้นได้',
    ms: 5600,
    accent: '#8b5cf6',
  },
  {
    id: 'create',
    path: '/create',
    chapter: 'create',
    via: 'nav-create',
    target: 'create-new',
    title: 'ระบบสร้างเกม',
    text: 'สร้างชุดคำถามเอง ใส่รูป คลิป และสูตรคณิตได้',
    ms: 5600,
    accent: '#14b8a6',
  },
  {
    id: 'modes',
    path: '/create',
    chapter: 'create',
    target: 'modes',
    title: `มีเกมให้เลือกเล่น ${MODES.length} รูปแบบ`,
    text: 'ชุดคำถามเดียว เลือกเล่นได้ทุกแบบ ทั้งห้องเล่นพร้อมกัน',
    ms: 6400,
    accent: '#14b8a6',
  },
  {
    id: 'studio',
    path: '/studio',
    chapter: 'create',
    via: 'nav-studio',
    target: 'studio-sizes',
    title: 'ระบบสร้างสื่อการสอน',
    text: 'ออกแบบใบงาน ป้าย เกียรติบัตรเอง แล้วโหลดเป็น PDF',
    ms: 5800,
    accent: '#ec4899',
  },
  {
    id: 'member',
    path: '/membership',
    chapter: 'member',
    via: 'nav-join',
    target: 'plans',
    title: 'สมัครสมาชิก',
    text: 'ปลดล็อกทุกเกม สร้างเกมและเปิดห้องได้ไม่จำกัด',
    ms: 6400,
    accent: '#f5a524',
  },
  {
    id: 'final',
    path: '/membership',
    chapter: 'member',
    title: 'เที่ยวครบแล้ว!',
    text: 'อยากปลดล็อกทุกอย่างเลยไหม เลือกได้ตามใจเลย',
    ms: 0,
    accent: '#f5a524',
    final: true,
  },
];
