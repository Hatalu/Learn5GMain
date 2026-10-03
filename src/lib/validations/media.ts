import { z } from 'zod';
import { ALL_GRADES, ALL_MEDIA_TYPES, ALL_SUBJECTS } from '@/types/database';

export const mediaSchema = z.object({
  title: z
    .string()
    .min(2, { message: 'กรุณากรอกชื่อสื่อการสอนอย่างน้อย 2 ตัวอักษร' })
    .max(150, { message: 'ชื่อสื่อการสอนต้องไม่เกิน 150 ตัวอักษร' })
    .trim(),
  description: z
    .string()
    .max(1000, { message: 'คำอธิบายต้องไม่เกิน 1,000 ตัวอักษร' })
    .optional()
    .or(z.literal('')),
  subject: z.enum(ALL_SUBJECTS as [string, ...string[]], {
    message: 'กรุณาเลือกวิชาที่ถูกต้อง',
  }),
  grade_level: z
    .array(z.enum(ALL_GRADES as [string, ...string[]]))
    .min(1, { message: 'กรุณาเลือกระดับชั้นอย่างน้อย 1 ระดับชั้น' }),
  media_type: z.enum(ALL_MEDIA_TYPES as [string, ...string[]], {
    message: 'กรุณาเลือกประเภทสื่อที่ถูกต้อง',
  }),
  game_url: z
    .string()
    .url({ message: 'กรุณากรอกลิงก์เว็บไซต์ที่ถูกต้อง (เช่น https://example.com)' })
    .trim(),
  icon_url: z
    .string()
    .min(1, { message: 'กรุณาอัปโหลดรูปภาพ Icon สำหรับสื่อการสอน' }),
});

export type MediaFormData = z.infer<typeof mediaSchema>;
