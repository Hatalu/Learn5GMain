import { hasMembership } from '@/lib/membership';
import type { Profile } from '@/types/database';

/**
 * สิทธิ์ในระบบสร้างเกม 3 ระดับ (ผู้ใช้กำหนด)
 * - guest  ยังไม่ล็อกอิน (หรือบัญชีทดลองเล่น): ดูหน้าได้ แต่สร้าง/เปิดใช้งานชุดคำถามไม่ได้
 * - free   มีบัญชีแต่ไม่ได้เป็นสมาชิก (หรือสมาชิกหมดอายุ): มีชุดคำถามได้ FREE_SET_LIMIT ชุด เปิดห้องเล่นได้เฉพาะชุดของตัวเอง
 * - member สมาชิก: สร้างได้เต็มที่ เปิดชุดของคนอื่นผ่าน Discover ได้
 * ตัวเลขทั้งหมดอยู่ที่นี่ที่เดียว (ฝั่งฐานข้อมูลใน migration 019 ต้องตรงกัน: 2 ชุด / 300 ชุด)
 */
export type CreatorTier = 'guest' | 'free' | 'member';

/** บัญชีฟรีสร้างชุดคำถามได้ FREE_SET_LIMIT ชุด "ตลอดอายุบัญชี" ลบชุดเดิมแล้วไม่คืนสิทธิ์ (นับจาก profiles.games_created) */
export const FREE_SET_LIMIT = 2;
export const MEMBER_SET_LIMIT = 300;

/** ระบบสร้างสื่อการสอน (Studio): บัญชีฟรี 3 สื่อตลอดอายุบัญชี (ต้องตรงกับ trigger ใน migration 024) (profiles.designs_created) สมาชิกไม่จำกัด (เพดานกันสแปม 500 ใน migration 023) */
export const FREE_DESIGN_LIMIT = 3;

/**
 * โควต้าไฟล์รูป/คลิปรวมต่อบัญชี (MB) คิดจากพื้นที่ Supabase แบบฟรี 1 GB ที่ใช้ร่วมกันทั้งเว็บ
 * รูปที่ย่อแล้วราว 100-250 KB, คลิป 5 วินาทีราว 1-3 MB
 *   ฟรี 5 MB   = รูปราว 25 รูป หรือคลิปราว 3 คลิป
 *   สมาชิก 30 MB = รูปราว 150 รูป หรือคลิปราว 15 คลิป
 */
export const FREE_UPLOAD_MB = 5;
export const MEMBER_UPLOAD_MB = 30;
export const UPLOAD_QUOTA_MB: Record<CreatorTier, number> = { guest: 0, free: FREE_UPLOAD_MB, member: MEMBER_UPLOAD_MB };

export const isTrialName = (name: string | null | undefined) => String(name || '').startsWith('trial_');

export function creatorTier(signedIn: boolean, profile: Pick<Profile, 'role' | 'premium_until' | 'username'> | null | undefined): CreatorTier {
  if (!signedIn || !profile || isTrialName(profile.username)) return 'guest';
  return hasMembership(profile) ? 'member' : 'free';
}

/** ชุดที่นับว่าใช้สิทธิ์ไปแล้ว = จำนวนที่เคยสร้างทั้งหมด (ถ้ายังไม่ได้รัน migration 021 ใช้จำนวนที่มีอยู่แทน) */
export const setsUsed = (made: number | null | undefined, current: number) => Math.max(Number(made) || 0, current);

export const quotaBytes = (tier: CreatorTier) => UPLOAD_QUOTA_MB[tier] * 1024 * 1024;

export function fmtMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 10 || Number.isInteger(mb)) return `${Math.round(mb)} MB`;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  return bytes > 0 ? '<0.1 MB' : '0 MB';
}

/** ข้อความอธิบายความต่างของแต่ละระดับ (ใช้ซ้ำทั้งหน้าสร้างเกม หน้าสมัครสมาชิก หน้าสมัครบัญชี) */
export const TIER_ROWS: { label: string; free: string; member: string }[] = [
  { label: 'สร้างชุดคำถามของตัวเอง', free: `${FREE_SET_LIMIT} ชุดตลอดอายุบัญชี ลบแล้วไม่คืนสิทธิ์`, member: 'ไม่จำกัด' },
  { label: 'เปิดห้องให้คนอื่นเล่น', free: 'ได้ เฉพาะชุดของตัวเอง', member: 'ได้ทุกชุด' },
  { label: 'ชุดคำถามของคนอื่น (Discover)', free: 'เปิดดู/ใช้ไม่ได้', member: 'ดู ทำสำเนา เปิดห้องได้' },
  { label: 'สร้างสื่อการสอน (ใบงาน ใบความรู้ ป้าย)', free: `${FREE_DESIGN_LIMIT} สื่อตลอดอายุบัญชี ลบแล้วไม่คืนสิทธิ์`, member: 'ไม่จำกัด ดู/ทำสำเนาสื่อใน Discover ได้' },
  { label: 'พื้นที่อัปโหลดรูปและคลิป', free: `รวมไม่เกิน ${FREE_UPLOAD_MB} MB`, member: `รวมไม่เกิน ${MEMBER_UPLOAD_MB} MB` },
  { label: 'เล่นเกมเต็มในคลังเกมหลัก', free: 'ทดลองเล่นเท่านั้น', member: 'เล่นได้ไม่จำกัด' },
];
