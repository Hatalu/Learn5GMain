import { z } from 'zod';

/** กติกาสมัครบัญชีเอง (หน้า /signup และ API ใช้ชุดเดียวกัน) */
export const RESERVED_NAMES = ['admin', 'administrator', 'root', 'support', 'staff', 'system', 'dev', 'owner', 'moderator', 'hatalu', 'learn5g'];

/**
 * อีเมลที่รับสมัคร: ต้องเป็น Gmail (@gmail.com) เท่านั้น และคืนค่า "รูปแบบกลาง" ที่ใช้เช็กซ้ำและเก็บในฐานข้อมูล
 * Gmail ถือว่าจุดในชื่อและส่วนหลังเครื่องหมาย + เป็นกล่องเดียวกัน (a.b+x@gmail.com = ab@gmail.com)
 * จึงตัดทิ้งก่อนเทียบ ไม่งั้นคนเดียวสมัครได้ไม่จำกัดด้วยอีเมลเดียว
 * ชื่ออีเมล Gmail จริงยาว 6-30 ตัว (a-z 0-9 และจุด ห้ามขึ้นต้น/ลงท้าย/จุดติดกัน) ไม่ถูกรูปแบบคืน null
 */
export function normalizeGmail(raw: string): string | null {
  const m = String(raw || '').trim().toLowerCase().match(/^([^@\s]+)@gmail\.com$/);
  if (!m) return null;
  const local = m[1].split('+')[0];
  if (!/^[a-z0-9]+(\.[a-z0-9]+)*$/.test(local)) return null;
  const key = local.replace(/\./g, '');
  return key.length >= 6 && key.length <= 30 ? `${key}@gmail.com` : null;
}

export const GMAIL_ONLY_MESSAGE = 'ใช้ได้เฉพาะอีเมล Gmail ที่ถูกต้อง (ลงท้าย @gmail.com)';

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, { message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' })
      .max(20, { message: 'ชื่อผู้ใช้ต้องไม่เกิน 20 ตัวอักษร' })
      .regex(/^[a-zA-Z0-9_-]+$/, { message: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z ตัวเลข _ และ -' }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { message: 'อีเมลยาวเกินไป' })
      .refine((v) => normalizeGmail(v) !== null, { message: GMAIL_ONLY_MESSAGE }),
    password: z.string().min(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }).max(72, { message: 'รหัสผ่านต้องไม่เกิน 72 ตัวอักษร' }),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    const low = v.username.toLowerCase();
    if (low.startsWith('trial_') || RESERVED_NAMES.includes(low)) ctx.addIssue({ code: 'custom', path: ['username'], message: 'ชื่อนี้สงวนไว้ ใช้ชื่ออื่นนะ' });
    if (v.email.endsWith('@internal.mediahub.local')) ctx.addIssue({ code: 'custom', path: ['email'], message: 'อีเมลไม่ถูกต้อง' });
    if (v.password !== v.confirm) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'รหัสผ่านสองช่องไม่ตรงกัน' });
  });

export type SignupInput = z.infer<typeof signupSchema>;
