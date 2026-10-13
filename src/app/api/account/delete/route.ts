import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { apiError, friendlyDbError, rateLimit } from '@/lib/server/security';
import { guard, logSecurityEvent } from '@/lib/server/session';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ password: z.string().min(1).max(100) });

/**
 * ลบบัญชีของตัวเอง (ผู้ปกครอง/ครู) พร้อมข้อมูลนักเรียนทั้งหมดที่ดูแล
 * ต้องยืนยันด้วยรหัสผ่านอีกครั้ง
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, ['parent', 'teacher', 'member']);
  if (!g.ok) return g.res;
  const { auth } = g;

  if (!rateLimit(`delacct:${auth.userId}`, 5, 15 * 60 * 1000)) return apiError(429, 'ลองบ่อยเกินไป');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'กรุณากรอกรหัสผ่านเพื่อยืนยัน');

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return apiError(401, 'กรุณาเข้าสู่ระบบ');

    // ตรวจรหัสผ่านด้วย client แยก (ไม่แตะ session ปัจจุบัน)
    const verifier = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: pwErr } = await verifier.auth.signInWithPassword({ email: user.email, password: parsed.data.password });
    if (pwErr) return apiError(403, 'รหัสผ่านไม่ถูกต้อง');

    const admin = getAdminClient();
    const { data: kids } = await admin.from('profiles').select('id').eq('owner_id', auth.userId);
    for (const k of kids || []) {
      await admin.auth.admin.deleteUser(k.id);
    }
    await logSecurityEvent('delete_account', auth.userId, `students=${(kids || []).length}`);
    const { error } = await admin.auth.admin.deleteUser(auth.userId);
    if (error) throw error;

    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
