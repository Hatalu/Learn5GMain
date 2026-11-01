/**
 * โค้ดรับสมาชิกฟรี 10 หลัก (ตัวอักษรผสมตัวเลข) ใช้ได้ทั้งฝั่งเว็บและเซิร์ฟเวอร์
 * ไม่มีตัวที่อ่านสับสน: 0/O, 1/I/L
 */
export const CODE_LEN = 10;
export const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** โค้ดที่ผู้ใช้กรอกค้างไว้ก่อนสมัคร/เข้าสู่ระบบ (ใช้ต่อให้อัตโนมัติหลังล็อกอิน) */
export const PENDING_CODE_KEY = 'l5g_pending_code';

/** ตัดช่องว่าง/ขีด แปลงเป็นตัวใหญ่ */
export const normCode = (s: string) => s.toUpperCase().replace(/[\s-]/g, '');

export const isCode = (s: string) => s.length === CODE_LEN && [...s].every((c) => CODE_ABC.includes(c));

/** สุ่มโค้ดจากไบต์สุ่ม (ส่ง crypto.getRandomValues หรือ randomBytes เข้ามา) */
export function makeCode(bytes: Uint8Array): string {
  let s = '';
  // 248 = 31 x 8: ตัดไบต์ที่เกินทิ้งให้ทุกตัวอักษรมีโอกาสเท่ากัน
  for (const b of bytes) if (b < 248 && s.length < CODE_LEN) s += CODE_ABC[b % CODE_ABC.length];
  return s;
}

/** ส่วนแสดงผล: ABCDE-FGHJK */
export const prettyCode = (s: string) => `${s.slice(0, 5)}-${s.slice(5)}`;

/** เครื่องหมายบอกหน้าหลักว่าเพิ่งใช้โค้ดสำเร็จตอนสมัคร (ให้ฉลองเมื่อกลับมาหน้าหลัก) */
export const CODE_DONE_KEY = 'l5g_code_done';

/** เรียก API ใช้โค้ด (ฝั่งเว็บ) */
export async function redeemCode(code: string): Promise<{ days?: number; error?: string; login?: boolean }> {
  try {
    const res = await fetch('/api/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { days: j.days } : { error: j.error || 'ใช้โค้ดไม่สำเร็จ', login: !!j.login };
  } catch {
    return { error: 'เชื่อมต่อไม่ได้ ลองใหม่นะ' };
  }
}

/** อ่าน/เขียนค่าโค้ดค้างใน localStorage (โหมดส่วนตัวอาจใช้ไม่ได้: เงียบไว้) */
export function readStore(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
export function writeStore(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* โหมดส่วนตัว */
  }
}
