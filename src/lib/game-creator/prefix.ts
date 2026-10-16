export const MEDIA_BUCKET = 'game-media';

/** URL นำหน้าไฟล์สาธารณะใน bucket game-media (ใช้ตรวจว่ารูป/คลิปในเกมมาจากที่เก็บของเราเท่านั้น) */
export function mediaPrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return base ? `${base}/storage/v1/object/public/${MEDIA_BUCKET}/` : '';
}
