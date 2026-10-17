import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin, limit } from '@/lib/server/rate-limit';
import { quotaBytes } from '@/lib/game-creator/quota';
import { getCreator, listUserFiles, sweepUnused, usedBytes } from '@/lib/server/creator-media';

export const dynamic = 'force-dynamic';

/** พื้นที่อัปโหลดที่ใช้ไปแล้ว / โควต้าของบัญชีนี้ */
export async function GET() {
  const me = await getCreator();
  if (!me) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  const files = await listUserFiles(me.id);
  return NextResponse.json({ tier: me.tier, used: usedBytes(files), quota: quotaBytes(me.tier), files: files.length });
}

/** ล้างไฟล์ที่ไม่มีเกมไหนใช้แล้ว เพื่อคืนพื้นที่ (ไฟล์ที่ตัวแก้ไขที่เปิดอยู่ใช้ และที่เพิ่งอัปโหลดใน 10 นาที จะไม่ถูกลบ) */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const me = await getCreator();
  if (!me) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  if (!(await limit(`upl-sweep:${me.id}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'ทำบ่อยเกินไป รอสักครู่นะ' }, { status: 429 });
  }
  let keep: string[] = [];
  try {
    const b = await req.json();
    if (Array.isArray(b?.keep)) keep = b.keep.filter((x: unknown) => typeof x === 'string' && x.length < 200).slice(0, 500);
  } catch {
    /* ว่าง */
  }
  const sw = await sweepUnused(me.id, { minAgeMs: 10 * 60 * 1000, keep });
  if (!sw.ok) return NextResponse.json({ error: 'ล้างไฟล์ไม่สำเร็จ (ผู้ดูแลต้องติดตั้ง migration 019 ก่อน)' }, { status: 503 });
  const files = await listUserFiles(me.id);
  return NextResponse.json({ tier: me.tier, used: usedBytes(files), quota: quotaBytes(me.tier), files: files.length, removed: sw.removed, freed: sw.freed });
}
