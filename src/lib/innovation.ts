import { bkkParts } from '@/lib/bkk-time';

/** ระบบสั่งทำนวัตกรรมตามแผนการสอน (เฉพาะแพ็กเกจที่มีสิทธิ์ innovation_jobs > 0 ค่าเริ่มต้น = Master) */
export type InnovStatus = 'pending' | 'working' | 'delivered' | 'revision' | 'cancelled';

export const INNOV_STATUS: Record<InnovStatus, string> = {
  pending: 'รอรับงาน',
  working: 'กำลังทำ',
  delivered: 'ส่งงานแล้ว',
  revision: 'ขอแก้ไข',
  cancelled: 'ยกเลิก',
};
export const isInnovStatus = (v: unknown): v is InnovStatus => typeof v === 'string' && v in INNOV_STATUS;

export interface InnovEvent {
  id: number;
  kind: 'submit' | 'revision' | 'status' | 'deliver';
  by_dev: boolean;
  message: string;
  file_name: string | null;
  file_path?: string | null;
  created_at: string;
}

export interface InnovRequest {
  id: string;
  user_id?: string;
  username: string;
  email: string;
  title: string;
  subject: string;
  grade: string;
  details: string;
  file_name: string | null;
  file_path?: string | null;
  file_size: number | null;
  status: InnovStatus;
  link: string | null;
  dev_note: string;
  revisions_used: number;
  month_key: string;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  events?: InnovEvent[];
}

/** เดือนตามเวลาไทย เช่น 2026-11 (โควต้า "งานต่อเดือน" นับตามนี้) */
export function monthKey(d = new Date()): string {
  const p = bkkParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

/** ชนิดไฟล์แผนการสอนที่รับ (ต้องตรงกับ allowed_mime_types ของ bucket innovation ใน migration 030) */
export const INNOV_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const INNOV_MAX_MB = 25;
export const INNOV_BUCKET = 'innovation';
/** รอคิว (ข้อความที่แสดงให้ครู) */
export const INNOV_WAIT = '3-7 วัน';
