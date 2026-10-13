import { z } from 'zod';
import { BUDDY_COLORS, HATS } from '@/lib/gamify';

const cleanText = (max: number, min = 1, msg = 'กรุณากรอกข้อมูล') =>
  z
    .string()
    .trim()
    .min(min, { message: msg })
    .max(max, { message: `ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร)` })
    // กันอักขระควบคุม
    .refine((s) => !/[\u0000-\u001f\u007f<>]/.test(s), { message: 'มีอักขระที่ไม่อนุญาต' });

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'กรุณากรอกอีเมลให้ถูกต้อง' }).max(120),
  password: z
    .string()
    .min(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
    .max(100, { message: 'รหัสผ่านยาวเกินไป' }),
  displayName: cleanText(40, 2, 'กรุณากรอกชื่อที่ใช้แสดง (อย่างน้อย 2 ตัวอักษร)'),
  role: z.enum(['parent', 'teacher'], { message: 'กรุณาเลือกว่าเป็นผู้ปกครองหรือคุณครู' }),
  acceptTerms: z.literal(true, { message: 'กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนตัว' }),
});

export const kidLoginSchema = z.object({
  code: z.string().trim().min(4).max(12),
  pin: z.string().regex(/^\d{4}$/, { message: 'PIN ต้องเป็นตัวเลข 4 หลัก' }),
});

export const studentNameSchema = cleanText(30, 1, 'กรุณากรอกชื่อเล่น');
export const gradeSchema = z.enum(['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6']);

export const createStudentsSchema = z.object({
  students: z
    .array(z.object({ name: studentNameSchema, grade: gradeSchema.optional() }))
    .min(1, { message: 'กรุณากรอกชื่อนักเรียนอย่างน้อย 1 คน' })
    .max(60, { message: 'เพิ่มได้ครั้งละไม่เกิน 60 คน' }),
  classId: z.string().uuid().optional(),
  avatar: z.string().max(20).optional(),
});

export const patchStudentSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reset_pin') }),
  z.object({ action: z.literal('rename'), name: studentNameSchema, grade: gradeSchema.optional() }),
  z.object({
    action: z.literal('set_limit'),
    minutes: z.number().int().min(5).max(480).nullable(),
  }),
]);

export const classSchema = z.object({
  name: cleanText(80, 1, 'กรุณากรอกชื่อห้อง'),
  grade: gradeSchema.optional(),
});

export const assignmentSchema = z.object({
  mediaId: z.string().uuid(),
  note: cleanText(300, 0).optional().or(z.literal('')),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const addMembersSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1).max(100),
});

export const playStartSchema = z.object({
  mediaId: z.string().uuid(),
  mode: z.enum(['play', 'teach']).default('play'),
});

export const heartbeatSchema = z.object({ sessionId: z.string().uuid() });

export const resultSchema = z.object({
  token: z.string().min(20).max(600),
  levelKey: z.string().trim().max(60).default('main'),
  score: z.number().int().min(0).max(100000).default(0),
  stars: z.number().int().min(0).max(3).optional(),
  correct: z.number().int().min(0).max(1000).default(0),
  total: z.number().int().min(0).max(1000).default(0),
  durationSec: z.number().int().min(0).max(7200).default(0),
  mistakes: z.array(z.string().trim().max(60)).max(20).default([]),
});

export const buddySchema = z.object({
  color: z.enum(BUDDY_COLORS as unknown as [string, ...string[]]).optional(),
  hat: z.enum(HATS as unknown as [string, ...string[]]).optional(),
});

export const claimSchema = z.object({ missionKey: z.string().min(1).max(30) });

export const premiumRequestSchema = z.object({
  plan: z.enum(['family', 'classroom', 'school']),
  contact: cleanText(120, 3, 'กรุณากรอกช่องทางติดต่อ (LINE / เบอร์โทร)'),
  note: cleanText(500, 0).optional().or(z.literal('')),
});

export const premiumDecisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  days: z.number().int().min(1).max(1095).optional(),
});

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง';
}
