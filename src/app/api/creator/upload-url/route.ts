import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSameOrigin, limit } from '@/lib/server/rate-limit';
import { MEDIA_BUCKET } from '@/lib/game-creator/prefix';
import { fmtMB, quotaBytes } from '@/lib/game-creator/quota';
import { getCreator, listUserFiles, sweepUnused, usedBytes } from '@/lib/server/creator-media';

export const dynamic = 'force-dynamic';

const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  // คลิปเสียงในโจทย์ (bucket ต้องอนุญาตด้วย: migration 025)
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'weba',
};
/** ขนาดสูงสุดต่อไฟล์ (ตรงกับ bucket game-media 25MB) */
const MAX_FILE = 25 * 1024 * 1024;

/**
 * ขอลิงก์อัปโหลดรูป/คลิปของเกม: ตรวจโควต้ารวมของบัญชีก่อน (บัญชีฟรี/สมาชิกต่างกัน) แล้วออกลิงก์ให้อัปโหลดเข้าโฟลเดอร์ของตัวเอง
 * เบราว์เซอร์อัปโหลดตรงเข้า Storage ไม่ได้อีกแล้ว (migration 019) จึงเลี่ยงโควต้าไม่ได้
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const me = await getCreator();
  if (!me) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อนจึงจะอัปโหลดได้' }, { status: 401 });
  if (!(await limit(`upl:${me.id}`, 80, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'อัปโหลดบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ว่าง */
  }
  const type = String(body.contentType || '').split(';')[0].trim().toLowerCase();
  const ext = EXT[type];
  const size = Math.floor(Number(body.size));
  if (!ext) return NextResponse.json({ error: 'รองรับเฉพาะรูป JPG PNG WEBP GIF และคลิป MP4 WEBM MOV' }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: 'ไฟล์ว่างเปล่า' }, { status: 400 });
  if (size > MAX_FILE) return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 25 MB' }, { status: 413 });

  const quota = quotaBytes(me.tier);
  let files = await listUserFiles(me.id);
  let used = usedBytes(files);
  if (used + size > quota) {
    // เต็มแล้ว: ลองล้างไฟล์ที่ไม่มีเกมไหนใช้แล้ว (เก่ากว่า 3 ชั่วโมง) ก่อนปฏิเสธ
    const sw = await sweepUnused(me.id, { minAgeMs: 3 * 3600 * 1000 });
    if (sw.removed) {
      files = await listUserFiles(me.id);
      used = usedBytes(files);
    }
  }
  if (used + size > quota) {
    return NextResponse.json(
      {
        error: `พื้นที่อัปโหลดเต็ม (ใช้ ${fmtMB(used)} จาก ${fmtMB(quota)}) ลบรูปหรือคลิปที่ไม่ใช้ในเกมออก${me.tier === 'free' ? ' หรือสมัครสมาชิกเพื่อเพิ่มพื้นที่' : ''}`,
        code: 'quota',
        used,
        quota,
      },
      { status: 413 }
    );
  }

  const path = `${me.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { data, error } = await getAdminClient().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    const m = String(error?.message || '');
    return NextResponse.json({ error: /bucket not found/i.test(m) ? 'ยังไม่ได้สร้างที่เก็บไฟล์ (รัน migration 015 ก่อน)' : 'ขอลิงก์อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง' }, { status: 500 });
  }
  return NextResponse.json({ path: data.path || path, token: data.token, used, quota });
}
