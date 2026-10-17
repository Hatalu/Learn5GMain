/**
 * สื่อประเภท "วิดีโอ": Dev ใส่ลิงก์คลิป YouTube แทนลิงก์เกม ทุกคนดูได้ (ไม่ต้องเป็นสมาชิก)
 * เล่นในจอบนหน้าเว็บผ่าน youtube-nocookie (ไม่ฝังคุกกี้ติดตามจนกว่าจะกดเล่น)
 */
import type { MediaType } from '@/types/database';

export const VIDEO_TYPE: MediaType = 'วิดีโอ';

export const isVideoMedia = (m: { media_type?: string | null } | null | undefined): boolean => m?.media_type === VIDEO_TYPE;

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com']);

function parse(raw: string): URL | null {
  const s = (raw || '').trim();
  if (!s) return null;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
}

/** รหัสคลิป 11 ตัวจากลิงก์ YouTube ทุกแบบ (watch, youtu.be, shorts, embed, live) ไม่ใช่ YouTube = null */
export function youTubeId(raw: string): string | null {
  const u = parse(raw);
  if (!u || !HOSTS.has(u.hostname.toLowerCase())) return null;
  let id: string | null = null;
  if (u.hostname.toLowerCase() === 'youtu.be') id = u.pathname.split('/')[1] || null;
  else if (u.pathname === '/watch') id = u.searchParams.get('v');
  else {
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
    id = m ? m[1] : null;
  }
  return id && ID.test(id) ? id : null;
}

/** เวลาเริ่ม (วินาที) จาก ?t= / ?start= เช่น 90, 90s, 1m30s, 1h2m3s */
export function youTubeStart(raw: string): number {
  const u = parse(raw);
  const t = u?.searchParams.get('t') || u?.searchParams.get('start') || (u?.hash.match(/t=([^&]+)/)?.[1] ?? '');
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Math.min(Number(t), 86400);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return 0;
  return Math.min(Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0), 86400);
}

/** ลิงก์ฝังสำหรับจอดูวิดีโอ (เล่นทันที ไม่โชว์คลิปแนะนำจากช่องอื่น) */
export function youTubeEmbedUrl(id: string, start = 0): string {
  const q = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
  if (start > 0) q.set('start', String(Math.floor(start)));
  return `https://www.youtube-nocookie.com/embed/${id}?${q.toString()}`;
}

/** รูปปกของคลิป (ใช้แสดงตัวอย่างตอน Dev ใส่ลิงก์) */
export const youTubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** ลิงก์ไปดูบน YouTube (สำรอง ถ้าเจ้าของคลิปปิดการฝัง) */
export const youTubeWatchUrl = (id: string, start = 0) => `https://www.youtube.com/watch?v=${id}${start > 0 ? `&t=${Math.floor(start)}s` : ''}`;
