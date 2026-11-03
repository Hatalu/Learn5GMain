/**
 * ไอคอนปกชุดคำถาม เก็บใน content.cover (ผ่าน sanitizeQuiz) แล้วคัดลอกไป user_games.cover_url ตอนบันทึก
 * - 'st:<sticker id>:<สี 0-5>' = สติกเกอร์ของเว็บบนพื้นสี
 * - URL รูปใน bucket game-media/<user id>/ ของเราเท่านั้น
 * ไม่มี cover = ใช้รูปแรกในชุด หรือลายตัวเลือกอัตโนมัติ (เหมือนเดิม)
 */
export const COVER_COLORS = ['#9b6cf0', '#4a7bf0', '#ff6b7a', '#3fd6a8', '#ff9a3d', '#4fb3ff'];

const ST = /^st:([a-z0-9-]{1,40}):([0-5])$/;
const PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9_.-]{1,120}$/;

export type Cover = { kind: 'sticker'; id: string; color: string } | { kind: 'image'; url: string; path: string };

export const stickerCover = (id: string, color: number) => `st:${id}:${color}`;

/** อ่านค่าปก: ค่าที่ไม่รู้จัก/รูปจากที่อื่น = null (ห้ามแสดงรูปจากเว็บภายนอก) */
export function parseCover(s: unknown, mediaPrefix: string): Cover | null {
  if (typeof s !== 'string' || s.length > 600) return null;
  const m = ST.exec(s);
  if (m) return { kind: 'sticker', id: m[1], color: COVER_COLORS[Number(m[2])] };
  if (!mediaPrefix || !s.startsWith(mediaPrefix)) return null;
  const path = s.slice(mediaPrefix.length);
  return PATH.test(path) ? { kind: 'image', url: s, path } : null;
}

export function cleanCover(s: unknown, mediaPrefix: string): string | undefined {
  return parseCover(s, mediaPrefix) ? (s as string) : undefined;
}
