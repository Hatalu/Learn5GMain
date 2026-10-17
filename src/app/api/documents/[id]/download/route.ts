import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { hasMembership } from '@/lib/membership';
import { TRIAL_PREFIX } from '@/lib/server/trial-account';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { DOC_BUCKET, DownloadFormat, filesForFormat, normalizeDocument, safeFileName, uniqueNames } from '@/lib/documents';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATS: DownloadFormat[] = ['pdf', 'word', 'both'];
/** ลิงก์ดาวน์โหลดใช้ได้ไม่กี่นาที (เอาไปแจกต่อไม่ได้นาน)
 * ชื่อไฟล์ภาษาไทยตั้งที่เบราว์เซอร์ตอนบันทึก (หัว Content-Disposition ของ Storage เข้ารหัสชื่อไทยซ้ำสองชั้น) */
const LINK_SECONDS = 5 * 60;

/**
 * ดาวน์โหลดเอกสาร/ใบงาน: เฉพาะสมาชิกที่สิทธิ์ยังไม่หมด (หรือ Dev) ไม่นับบัญชีทดลองเล่น
 * คืนลิงก์ชั่วคราวของไฟล์ต้นฉบับใน bucket ส่วนตัว (เบราว์เซอร์โหลดตรงจาก Storage ไม่ผ่านเซิร์ฟเวอร์เรา)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  if (!UUID.test(id || '')) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

  let format = '' as DownloadFormat;
  try {
    const body = await req.json();
    format = String(body?.format || '') as DownloadFormat;
  } catch {
    /* ตรวจด้านล่าง */
  }
  if (!FORMATS.includes(format)) return NextResponse.json({ error: 'เลือกรูปแบบไฟล์ไม่ถูกต้อง' }, { status: 400 });

  const ip = clientIp(req);
  if (!(await limit(`docdl:${ip}`, 40, 10 * 60 * 1000))) {
    return NextResponse.json({ error: 'ดาวน์โหลดถี่เกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'เข้าสู่ระบบก่อน แล้วสมัครสมาชิกเพื่อดาวน์โหลด', need: 'login' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('username, role, premium_until').eq('id', user.id).maybeSingle();
  const member = !!profile && !String(profile.username || '').startsWith(TRIAL_PREFIX) && hasMembership(profile);
  if (!member) return NextResponse.json({ error: 'ดาวน์โหลดได้เฉพาะสมาชิก สมัครสมาชิกก่อนนะ', need: 'member' }, { status: 403 });

  // กันดูดไฟล์ทั้งคลังด้วยบัญชีเดียว
  if (profile.role !== 'dev' && !(await limit(`docdl-u:${user.id}`, 80, 3600 * 1000))) {
    return NextResponse.json({ error: 'ดาวน์โหลดครบโควตาชั่วโมงนี้แล้ว ลองใหม่ภายหลังนะ' }, { status: 429 });
  }

  try {
    const admin = getAdminClient();
    const { data: row } = await admin.from('documents').select('*').eq('id', id).maybeSingle();
    if (!row || (row.is_public === false && profile.role !== 'dev')) {
      return NextResponse.json({ error: 'ไม่พบเอกสารนี้' }, { status: 404 });
    }
    const doc = normalizeDocument(row);
    const files = filesForFormat(doc.files, format);
    if (!files.length) return NextResponse.json({ error: 'เอกสารนี้ไม่มีไฟล์รูปแบบที่เลือก' }, { status: 400 });

    const names = uniqueNames(files.map((f) => f.name));
    const out: { name: string; url: string; size: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      const { data, error } = await admin.storage.from(DOC_BUCKET).createSignedUrl(files[i].path, LINK_SECONDS);
      if (error || !data?.signedUrl) throw error || new Error('sign');
      out.push({ name: names[i], url: data.signedUrl, size: files[i].size });
    }

    await admin.rpc('increment_document_count', { p_id: id, p_download: true });
    return NextResponse.json({ files: out, zipName: `${safeFileName(doc.title, 'เอกสาร')}.zip` });
  } catch {
    return NextResponse.json({ error: 'ดาวน์โหลดไม่ได้ในตอนนี้ ลองใหม่อีกครั้งนะ' }, { status: 500 });
  }
}
