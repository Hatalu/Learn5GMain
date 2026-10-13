import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { premiumRequestSchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';

const ADULTS = ['parent', 'teacher', 'member'] as const;

export async function GET(req: NextRequest) {
  const g = await guard(req, [...ADULTS, 'dev']);
  if (!g.ok) return g.res;
  try {
    const { data, error } = await getAdminClient()
      .from('premium_requests')
      .select('id, plan, status, created_at, decided_at')
      .eq('user_id', g.auth.userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}

/** ขอใช้งาน Premium (แอดมินติดต่อกลับและอนุมัติ) */
export async function POST(req: NextRequest) {
  const g = await guard(req, [...ADULTS]);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = premiumRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const admin = getAdminClient();
    const { count } = await admin
      .from('premium_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', g.auth.userId)
      .eq('status', 'pending');
    if ((count || 0) > 0) return apiError(409, 'คุณมีคำขอที่รอการอนุมัติอยู่แล้ว');

    const { error } = await admin.from('premium_requests').insert({
      user_id: g.auth.userId,
      plan: parsed.data.plan,
      contact: parsed.data.contact,
      note: parsed.data.note || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
