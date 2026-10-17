import { z } from 'zod';

/** กติกาสมัครบัญชีเอง (หน้า /signup และ API ใช้ชุดเดียวกัน) */
export const RESERVED_NAMES = ['admin', 'administrator', 'root', 'support', 'staff', 'system', 'dev', 'owner', 'moderator', 'hatalu', 'learn5g'];

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
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, { message: 'อีเมลไม่ถูกต้อง' }),
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
