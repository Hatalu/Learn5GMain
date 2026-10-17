import { z } from 'zod';
import { ALL_GRADES, ALL_MEDIA_TYPES, ALL_SUBJECTS } from '@/types/database';
import { VIDEO_TYPE, youTubeId } from '@/lib/youtube';

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
  access_tier: z.enum(['free', 'premium'], {
    message: 'กรุณาเลือกระดับการเข้าถึง (free หรือ premium)',
  }).default('premium'),
  is_public: z.boolean().default(true).optional(),
  game_url: z
    .string()
    .url({ message: 'กรุณากรอกลิงก์เว็บไซต์ที่ถูกต้อง (เช่น https://example.com)' })
    .trim(),
  icon_url: z
    .string()
    .min(1, { message: 'กรุณาอัปโหลดรูปภาพ Icon สำหรับสื่อการสอน' }),
}).superRefine((v, ctx) => {
  // ประเภทวิดีโอ: ลิงก์ต้องเป็นคลิป YouTube (เล่นในจอบนหน้าเว็บ)
  if (v.media_type === VIDEO_TYPE && !youTubeId(v.game_url)) {
    ctx.addIssue({ code: 'custom', path: ['game_url'], message: 'ประเภทวิดีโอต้องใส่ลิงก์คลิป YouTube (เช่น https://www.youtube.com/watch?v=... หรือ https://youtu.be/...)' });
  }
});

export type MediaFormData = z.infer<typeof mediaSchema>;
