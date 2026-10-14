import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { promptPayKind } from '@/lib/promptpay';
import { easySlipConfigured } from '@/lib/server/payments';

export const dynamic = 'force-dynamic';

async function verifyDev() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || p.role !== 'dev') return { ok: false, status: 403, error: 'สำหรับ Dev เท่านั้น' };
  return { ok: true, status: 200, error: '' };
}

/** ตั้งค่าบัญชีรับเงิน + รายการคำสั่งซื้อ + ยอดรวม */
export async function GET() {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const admin = getAdminClient();
  const [{ data: settings, error: sErr }, { data: orders }] = await Promise.all([
    admin.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    admin
      .from('payment_orders')
      .select('id, username, plan, days, amount, status, trans_ref, slip_date, sender_name, attempts, last_error, created_at, paid_at, premium_until')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);
  if (sErr) return NextResponse.json({ missing: true, easySlip: easySlipConfigured() });
  const paid = (orders || []).filter((o) => o.status === 'paid');
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return NextResponse.json({
    settings,
    orders: orders || [],
    easySlip: easySlipConfigured(),
    totals: {
      paidCount: paid.length,
      revenue: paid.reduce((a, o) => a + Number(o.amount), 0),
      monthRevenue: paid.filter((o) => o.paid_at && new Date(o.paid_at) >= monthStart).reduce((a, o) => a + Number(o.amount), 0),
    },
  });
}

/** บันทึกตั้งค่าบัญชีรับเงิน */
export async function PUT(req: NextRequest) {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let b: any = {};
  try {
    b = await req.json();
  } catch {
    /* ว่าง */
  }
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;
  const promptpay = clean(b.promptpay_id, 20)?.replace(/\D/g, '') || null;
  const row = {
    id: 1,
    enabled: !!b.enabled,
    promptpay_id: promptpay,
    account_name: clean(b.account_name, 120),
    bank_name: clean(b.bank_name, 60),
    bank_account: clean(b.bank_account, 30)?.replace(/[^\d]/g, '') || null,
    updated_at: new Date().toISOString(),
  };
  if (promptpay && !promptPayKind(promptpay)) {
    return NextResponse.json({ error: 'เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขบัตรประชาชน 13 หลัก หรือ e-Wallet 15 หลัก' }, { status: 400 });
  }
  if (row.enabled && (!promptpay || !row.account_name)) {
    return NextResponse.json({ error: 'ก่อนเปิดรับชำระ ต้องใส่เลขพร้อมเพย์และชื่อบัญชี' }, { status: 400 });
  }
  if (row.enabled && !easySlipConfigured()) {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า EASYSLIP_API_KEY บนเซิร์ฟเวอร์ จึงเปิดรับชำระไม่ได้' }, { status: 400 });
  }
  const { error } = await getAdminClient().from('payment_settings').upsert(row, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
