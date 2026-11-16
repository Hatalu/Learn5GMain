import { tierOf, type Tier } from '@/lib/entitlements';
import type { Profile } from '@/types/database';

/**
 * สิทธิ์ในระบบสร้างเกม/สื่อ
 * - guest  ยังไม่ล็อกอิน (หรือบัญชีทดลองเก่า): ดูหน้าได้ แต่บันทึกไม่ได้
 * - free   มีบัญชีแต่ไม่มีแพ็กเกจ (หรือหมดอายุ)
 * - member มีแพ็กเกจ Plus/Pro/Master ที่ยังไม่หมด
 * ตัวเลขจริงของแต่ละแพ็กเกจอยู่ที่ lib/entitlements.ts (ตาราง plan_entitlements, Dev แก้ได้)
 */
export type CreatorTier = 'guest' | 'free' | 'member';

export { isTrialName } from '@/lib/entitlements';

type P = Pick<Profile, 'role' | 'premium_until' | 'username'> & { plan?: string | null };

export function creatorTier(signedIn: boolean, profile: P | null | undefined): CreatorTier {
  if (!signedIn || !profile || String(profile.username || '').startsWith('trial_')) return 'guest';
  return tierOf(profile) === 'free' ? 'free' : 'member';
}

/** แพ็กเกจของผู้สร้าง (guest ใช้สิทธิ์แบบบัญชีฟรีในการแสดงผล) */
export const planTier = (signedIn: boolean, profile: P | null | undefined): Tier => (signedIn ? tierOf(profile) : 'free');

/** ชุดที่นับว่าใช้สิทธิ์ไปแล้ว = จำนวนที่เคยสร้างทั้งหมด (บัญชีฟรี) */
export const setsUsed = (made: number | null | undefined, current: number) => Math.max(Number(made) || 0, current);

/** ถึงเพดานหรือยัง: บัญชีฟรีนับตลอดอายุ แพ็กเกจนับที่มีอยู่ (null = ไม่จำกัด) */
export function atCap(tier: Tier, cap: number | null, made: number | null | undefined, current: number): boolean {
  if (cap === null) return false;
  return (tier === 'free' ? setsUsed(made, current) : current) >= cap;
}

export const mbBytes = (mb: number) => mb * 1024 * 1024;

export function fmtMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 10 || Number.isInteger(mb)) return `${Math.round(mb)} MB`;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  return bytes > 0 ? '<0.1 MB' : '0 MB';
}
