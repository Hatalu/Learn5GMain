import type { Profile } from '@/types/database';

/**
 * สมาชิก = ผู้ใช้ที่ล็อกอินอยู่และสิทธิ์สมาชิกยังไม่หมดอายุ (หรือเป็น Dev)
 * ทุกสื่อในเว็บเล่นเต็มรูปแบบได้เฉพาะสมาชิก; ผู้อื่นใช้ "ทดลองเล่น" ได้
 * (คอลัมน์ premium_until ในฐานข้อมูลใช้เก็บวันหมดอายุสมาชิก)
 */
export function hasMembership(profile: Pick<Profile, 'role' | 'premium_until'> | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === 'dev') return true;
  const until = profile.premium_until;
  if (!until || until === '-' || String(until).trim() === '') return false;
  const t = new Date(until).getTime();
  return !isNaN(t) && t > Date.now();
}

/** ลิงก์เพจสำหรับสมัครสมาชิก */
export const CONTACT_PAGE_URL = 'https://www.facebook.com/profile.php?id=61594556657667';
