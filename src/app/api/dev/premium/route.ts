import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { premiumDecisionSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard, logSecurityEvent } from '@/lib/server/session';

/** รายการคำขอ Premium (เฉพาะ Dev) */
export async function GET(req: NextRequest) {
  const g = await guard(req, ['dev']);
  if (!g.ok) return g.res;
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('premium_requests')
      .select('id, user_id, plan, contact, note, status, created_at, decided_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const ids = Array.from(new Set((data || []).map((r: { user_id: string }) => r.user_id)));
    const { data: users } = ids.length
      ? await admin.from('profiles').select('id, username, display_name, role, premium_until').in('id', ids)
      : { data: [] as { id: string; username: string; display_name: string | null; role: string; premium_until: string | null }[] };
    const um = new Map((users || []).map((u: { id: string }) => [u.id, u]));
    return NextResponse.json({
      requests: (data || []).map((r: { user_id: string }) => ({ ...r, user: um.get(r.user_id) || null })),
    });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

/** อนุมัติ/ปฏิเสธ: อนุมัติแล้วต่ออายุ Premium ให้ผู้ขอและนักเรียนทุกคนที่เขาดูแล */
export async function POST(req: NextRequest) {
  const g = await guard(req, ['dev']);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = premiumDecisionSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const admin = getAdminClient();
    const { data: reqRow } = await admin
      .from('premium_requests')
      .select('id, user_id, status')
      .eq('id', parsed.data.id)
      .maybeSingle();
    if (!reqRow) return apiError(404, 'ไม่พบคำขอ');
    if (reqRow.status !== 'pending') return apiError(409, 'คำขอนี้ดำเนินการไปแล้ว');

    if (parsed.data.decision === 'approve') {
      const days = parsed.data.days ?? 365;
      const { data: user } = await admin.from('profiles').select('premium_until').eq('id', reqRow.user_id).single();
      const base = user?.premium_until && new Date(user.premium_until).getTime() > Date.now() ? new Date(user.premium_until) : new Date();
      const until = new Date(base.getTime() + days * 86400000).toISOString();

      const { error: e1 } = await admin.from('profiles').update({ premium_until: until }).eq('id', reqRow.user_id);
      if (e1) throw e1;
      // นักเรียนในความดูแลได้สิทธิ์ตาม
      const { error: e2 } = await admin.from('profiles').update({ premium_until: until }).eq('owner_id', reqRow.user_id);
      if (e2) throw e2;
    }

    const { error } = await admin
      .from('premium_requests')
      .update({ status: parsed.data.decision === 'approve' ? 'approved' : 'rejected', decided_at: new Date().toISOString() })
      .eq('id', reqRow.id);
    if (error) throw error;

    await logSecurityEvent(`premium_${parsed.data.decision}`, g.auth.userId, reqRow.user_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
