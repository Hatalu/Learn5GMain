import { z } from 'zod';

export const createMemberSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' })
    .max(30, { message: 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ - เท่านั้น' })
    .trim(),
  password: z
    .string()
    .min(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    .max(100, { message: 'รหัสผ่านยาวเกินไป' }),
  role: z.enum(['member', 'dev'], {
    message: 'สิทธิ์ผู้ใช้งานต้องเป็น member หรือ dev เท่านั้น',
  }),
  premium_until: z.string().optional().nullable(),
});

export const editMemberSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' })
    .max(30, { message: 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ - เท่านั้น' })
    .trim(),
  role: z.enum(['member', 'dev'], {
    message: 'สิทธิ์ผู้ใช้งานต้องเป็น member หรือ dev เท่านั้น',
  }),
  premium_until: z.string().optional().nullable(),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, { message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    .max(100, { message: 'รหัสผ่านยาวเกินไป' }),
});

export type CreateMemberFormData = z.infer<typeof createMemberSchema>;
export type EditMemberFormData = z.infer<typeof editMemberSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
